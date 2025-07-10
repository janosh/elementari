"""Trajectory visualization widget for Jupyter notebooks."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union

import anywidget
import traitlets as t

if TYPE_CHECKING:
    from typing import Any as AnyType

# Read the bundled frontend code
_STATIC_DIR = Path(__file__).parent / "static"


class TrajectoryWidget(anywidget.AnyWidget):
    """Interactive trajectory visualization widget for Jupyter notebooks.
    
    This widget wraps the MatterViz Trajectory.svelte component for use in 
    Jupyter notebooks and other anywidget-compatible environments.
    
    Examples:
        Basic usage:
        >>> from matterviz_notebook import TrajectoryWidget
        >>> trajectory_data = [...]  # List of structures or trajectory dict
        >>> widget = TrajectoryWidget(trajectory=trajectory_data)
        >>> widget
        
        With custom visualization options:
        >>> widget = TrajectoryWidget(
        ...     trajectory=trajectory_data,
        ...     display_mode="structure+scatter",
        ...     layout="horizontal",
        ...     show_controls=True
        ... )
    """
    
    _esm = (_STATIC_DIR / "index.js").read_text()
    _css = (_STATIC_DIR / "style.css").read_text()
    
    # Core trajectory data
    trajectory = t.Dict(allow_none=True).tag(sync=True)
    
    # Playback control
    current_step_idx = t.Int(0).tag(sync=True)
    
    # Layout and display options
    layout = t.Unicode("auto").tag(sync=True)  # auto, horizontal, vertical
    display_mode = t.Unicode("structure+scatter").tag(sync=True)  # structure+scatter, structure, scatter, histogram, structure+histogram
    
    # UI controls
    show_controls = t.Bool(True).tag(sync=True)
    show_fullscreen_button = t.Bool(True).tag(sync=True)
    
    # Widget dimensions
    width = t.Int(800).tag(sync=True)
    height = t.Int(600).tag(sync=True)
    
    # Structure visualization properties (passed to embedded Structure component)
    atom_radius = t.Float(1.0).tag(sync=True)
    show_atoms = t.Bool(True).tag(sync=True)
    show_bonds = t.Bool(False).tag(sync=True)
    show_site_labels = t.Bool(False).tag(sync=True)
    show_image_atoms = t.Bool(True).tag(sync=True)
    show_force_vectors = t.Bool(False).tag(sync=True)
    same_size_atoms = t.Bool(False).tag(sync=True)
    auto_rotate = t.Float(0.0).tag(sync=True)
    color_scheme = t.Unicode("Vesta").tag(sync=True)
    
    # Plot visualization properties
    step_labels = t.Union([t.Int(), t.List()], allow_none=True, default_value=5).tag(sync=True)
    
    def __init__(
        self,
        trajectory: Optional[Union[Dict[str, Any], List[Any], AnyType]] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the TrajectoryWidget.
        
        Args:
            trajectory: Trajectory data (dict with frames, or list of structures)
            **kwargs: Additional widget properties
        """
        # Convert trajectory objects to the expected format if needed
        if trajectory is not None:
            trajectory = self._normalize_trajectory(trajectory)
            
        super().__init__(trajectory=trajectory, **kwargs)
        
    def _normalize_trajectory(self, trajectory: Any) -> Optional[Dict[str, Any]]:
        """Convert various trajectory formats to the expected dictionary format."""
        if trajectory is None:
            return None
            
        # Handle dictionary input (already normalized trajectory format)
        if isinstance(trajectory, dict) and "frames" in trajectory:
            return trajectory
            
        # Handle list of structures
        if isinstance(trajectory, (list, tuple)):
            return self._list_to_trajectory_dict(list(trajectory))
            
        # Try to convert specific trajectory formats
        try:
            from .mime import is_ase_atoms
            # Single structure - convert to single-frame trajectory
            if is_ase_atoms(trajectory):
                return self._list_to_trajectory_dict([trajectory])
        except ImportError:
            pass
            
        try:
            from .mime import is_pymatgen_structure
            if is_pymatgen_structure(trajectory):
                return self._list_to_trajectory_dict([trajectory])
        except ImportError:
            pass
            
        # If we can't convert, try to serialize to see if it has useful data
        try:
            return json.loads(json.dumps(trajectory, default=str))
        except (TypeError, ValueError):
            raise ValueError(
                f"Unsupported trajectory type: {type(trajectory)}. "
                "Please provide a dictionary with 'frames' key, a list of structures, "
                "or a single structure object."
            )
    
    def _list_to_trajectory_dict(self, structures: List[Any]) -> Dict[str, Any]:
        """Convert a list of structures to trajectory dictionary format."""
        if not structures:
            raise ValueError("Empty structure list provided")
            
        trajectory_dict = {
            "frames": [],
            "metadata": {}
        }
        
        for i, structure in enumerate(structures):
            # Convert each structure to the standard format
            normalized_structure = self._normalize_structure(structure)
            
            frame = {
                "structure": normalized_structure,
                "metadata": {
                    "step": i,
                    "frame_idx": i
                }
            }
            
            # Try to extract additional metadata if it's available
            try:
                # ASE Atoms objects might have calculator data
                from .mime import is_ase_atoms
                if is_ase_atoms(structure):
                    frame["metadata"].update(self._extract_ase_metadata(structure))
            except ImportError:
                pass
                
            try:
                # Pymatgen structures might have properties
                from .mime import is_pymatgen_structure
                if is_pymatgen_structure(structure):
                    if hasattr(structure, 'properties') and structure.properties:
                        frame["metadata"].update(structure.properties)
            except ImportError:
                pass
                
            trajectory_dict["frames"].append(frame)
            
        return trajectory_dict
    
    def _normalize_structure(self, structure: Any) -> Dict[str, Any]:
        """Convert a structure to the standard dictionary format."""
        # Import and use the structure normalization from StructureWidget
        from .structure import StructureWidget
        widget = StructureWidget()
        result = widget._normalize_structure(structure)
        if result is None:
            raise ValueError(f"Could not normalize structure: {structure}")
        return result
    
    def _extract_ase_metadata(self, atoms: Any) -> Dict[str, Any]:
        """Extract metadata from ASE Atoms object."""
        metadata = {}
        
        try:
            # Try to get energy
            if hasattr(atoms, 'get_potential_energy'):
                try:
                    energy = atoms.get_potential_energy()
                    metadata["energy"] = float(energy)
                    metadata["energy_per_atom"] = float(energy / len(atoms))
                except Exception:
                    pass
                    
            # Try to get forces
            if hasattr(atoms, 'get_forces'):
                try:
                    forces = atoms.get_forces()
                    if forces is not None:
                        # Calculate force statistics
                        force_norms = [float((f**2).sum()**0.5) for f in forces]
                        metadata["force_max"] = max(force_norms)
                        metadata["force_norm"] = float((sum(fn**2 for fn in force_norms))**0.5)
                except Exception:
                    pass
                    
            # Try to get stress
            if hasattr(atoms, 'get_stress'):
                try:
                    stress = atoms.get_stress()
                    if stress is not None:
                        metadata["stress_max"] = float(max(abs(stress)))
                except Exception:
                    pass
                    
            # Get volume and density
            if atoms.cell is not None and atoms.cell.volume > 0:
                metadata["volume"] = float(atoms.cell.volume)
                
                # Calculate density (need masses)
                try:
                    masses = atoms.get_masses()
                    total_mass = float(masses.sum())  # in amu
                    # Convert to g/cm³: amu -> g, Å³ -> cm³
                    density = total_mass * 1.66054e-24 / (atoms.cell.volume * 1e-24)
                    metadata["density"] = density
                except Exception:
                    pass
                    
                # Get cell parameters
                lengths = atoms.cell.lengths()
                metadata["a"] = float(lengths[0])
                metadata["b"] = float(lengths[1])
                metadata["c"] = float(lengths[2])
                
        except Exception:
            pass  # Ignore errors in metadata extraction
            
        return metadata

    def update_trajectory(self, new_trajectory: Union[Dict[str, Any], List[Any], Any]) -> None:
        """Update the displayed trajectory.
        
        Args:
            new_trajectory: New trajectory data to display
        """
        self.trajectory = self._normalize_trajectory(new_trajectory)
        self.current_step_idx = 0  # Reset to first frame
        
    def set_step(self, step_idx: int) -> None:
        """Jump to a specific step in the trajectory.
        
        Args:
            step_idx: Frame index to jump to
        """
        if self.trajectory and "frames" in self.trajectory:
            max_step = len(self.trajectory["frames"]) - 1
            self.current_step_idx = max(0, min(step_idx, max_step))
        else:
            self.current_step_idx = 0
            
    def set_view_options(
        self,
        *,
        display_mode: Optional[str] = None,
        layout: Optional[str] = None,
        atom_radius: Optional[float] = None,
        color_scheme: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """Update visualization options.
        
        Args:
            display_mode: Display mode ("structure+scatter", "structure", "scatter", etc.)
            layout: Layout ("auto", "horizontal", "vertical")
            atom_radius: Scale factor for atomic radii
            color_scheme: Color scheme name
            **kwargs: Additional view options
        """
        updates = {}
        
        if display_mode is not None:
            updates["display_mode"] = display_mode
        if layout is not None:
            updates["layout"] = layout
        if atom_radius is not None:
            updates["atom_radius"] = atom_radius
        if color_scheme is not None:
            updates["color_scheme"] = color_scheme
            
        # Add any additional kwargs
        updates.update(kwargs)
        
        # Apply all updates at once
        for key, value in updates.items():
            if hasattr(self, key):
                setattr(self, key, value)
                
    @property
    def num_frames(self) -> int:
        """Get the number of frames in the trajectory."""
        if self.trajectory and "frames" in self.trajectory:
            return len(self.trajectory["frames"])
        return 0
        
    @property
    def current_structure(self) -> Optional[Dict[str, Any]]:
        """Get the structure for the current step."""
        if (self.trajectory and 
            "frames" in self.trajectory and 
            0 <= self.current_step_idx < len(self.trajectory["frames"])):
            return self.trajectory["frames"][self.current_step_idx].get("structure")
        return None