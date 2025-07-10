"""Structure visualization widget for Jupyter notebooks."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional, Union

import anywidget
import traitlets as t

if TYPE_CHECKING:
    from typing import Any as AnyType

# Read the bundled frontend code
_STATIC_DIR = Path(__file__).parent / "static"


class StructureWidget(anywidget.AnyWidget):
    """Interactive structure visualization widget for Jupyter notebooks.
    
    This widget wraps the MatterViz Structure.svelte component for use in 
    Jupyter notebooks and other anywidget-compatible environments.
    
    Examples:
        Basic usage:
        >>> from matterviz_notebook import StructureWidget
        >>> structure_data = {...}  # Structure dictionary from pymatgen/ASE
        >>> widget = StructureWidget(structure=structure_data)
        >>> widget
        
        With custom visualization options:
        >>> widget = StructureWidget(
        ...     structure=structure_data,
        ...     atom_radius=0.8,
        ...     show_bonds=True,
        ...     color_scheme="Jmol"
        ... )
    """
    
    _esm = (_STATIC_DIR / "index.js").read_text()
    _css = (_STATIC_DIR / "style.css").read_text()
    
    # Core structure data
    structure = t.Dict(allow_none=True).tag(sync=True)
    
    # Scene visualization properties
    atom_radius = t.Float(1.0).tag(sync=True)
    show_atoms = t.Bool(True).tag(sync=True)
    show_bonds = t.Bool(False).tag(sync=True)
    show_site_labels = t.Bool(False).tag(sync=True)
    show_image_atoms = t.Bool(True).tag(sync=True)
    show_force_vectors = t.Bool(False).tag(sync=True)
    same_size_atoms = t.Bool(False).tag(sync=True)
    auto_rotate = t.Float(0.0).tag(sync=True)
    
    # Force vector properties  
    force_vector_scale = t.Float(1.0).tag(sync=True)
    force_vector_color = t.Unicode("#ff6b6b").tag(sync=True)
    
    # Bond properties
    bond_thickness = t.Float(0.1).tag(sync=True)
    bond_color = t.Unicode("#666666").tag(sync=True)
    bonding_strategy = t.Unicode("nearest_neighbor").tag(sync=True)
    
    # Cell/lattice properties
    cell_edge_opacity = t.Float(0.8).tag(sync=True)
    cell_surface_opacity = t.Float(0.1).tag(sync=True)
    cell_edge_color = t.Unicode("#333333").tag(sync=True)
    cell_surface_color = t.Unicode("#333333").tag(sync=True)
    cell_line_width = t.Float(2.0).tag(sync=True)
    show_vectors = t.Bool(True).tag(sync=True)
    
    # Visual styling
    color_scheme = t.Unicode("Vesta").tag(sync=True)
    background_color = t.Unicode(allow_none=True).tag(sync=True)
    background_opacity = t.Float(0.1).tag(sync=True)
    
    # Widget dimensions
    width = t.Int(600).tag(sync=True)
    height = t.Int(500).tag(sync=True)
    
    # UI controls
    show_controls = t.Bool(True).tag(sync=True)
    show_info = t.Bool(True).tag(sync=True)
    show_fullscreen_button = t.Bool(True).tag(sync=True)
    
    # Export settings
    png_dpi = t.Int(150).tag(sync=True)
    
    def __init__(
        self,
        structure: Optional[Union[Dict[str, Any], AnyType]] = None,
        **kwargs: Any,
    ) -> None:
        """Initialize the StructureWidget.
        
        Args:
            structure: Structure data (dict from pymatgen/ASE .as_dict() or similar)
            **kwargs: Additional widget properties
        """
        # Convert structure objects to dictionaries if needed
        if structure is not None:
            structure = self._normalize_structure(structure)
            
        super().__init__(structure=structure, **kwargs)
        
    def _normalize_structure(self, structure: Any) -> Optional[Dict[str, Any]]:
        """Convert various structure formats to the expected dictionary format."""
        if structure is None:
            return None
            
        # Handle dictionary input (already normalized)
        if isinstance(structure, dict):
            return structure
            
        # Try to convert ASE Atoms objects
        try:
            from .mime import is_ase_atoms
            if is_ase_atoms(structure):
                return self._ase_to_dict(structure)
        except ImportError:
            pass
            
        # Try to convert pymatgen Structure objects
        try:
            from .mime import is_pymatgen_structure
            if is_pymatgen_structure(structure):
                return structure.as_dict()
        except ImportError:
            pass
            
        # Try to convert phonopy Atoms objects
        try:
            from .mime import is_phonopy_atoms
            if is_phonopy_atoms(structure):
                return self._phonopy_to_dict(structure)
        except ImportError:
            pass
            
        # If we can't convert, try to serialize to see if it has useful data
        try:
            return json.loads(json.dumps(structure, default=str))
        except (TypeError, ValueError):
            raise ValueError(
                f"Unsupported structure type: {type(structure)}. "
                "Please provide a dictionary, ASE Atoms, pymatgen Structure, "
                "or phonopy Atoms object."
            )
    
    def _ase_to_dict(self, atoms: Any) -> Dict[str, Any]:
        """Convert ASE Atoms object to structure dictionary."""
        try:
            # Import ASE Atoms for type checking
            from ase import Atoms
            if not isinstance(atoms, Atoms):
                raise ValueError("Expected ASE Atoms object")
                
            # Basic structure data
            structure_dict = {
                "sites": [],
                "charge": 0,  # ASE doesn't track charge directly
            }
            
            # Convert atomic positions and elements  
            for i, (symbol, position) in enumerate(zip(atoms.get_chemical_symbols(), atoms.get_positions())):
                site = {
                    "species": [{"element": symbol, "occu": 1.0}],
                    "abc": position.tolist(),  # Will be converted to fractional if cell exists
                    "xyz": position.tolist(),
                    "label": f"{symbol}{i}",
                    "properties": {}
                }
                
                # Add forces if available
                if hasattr(atoms, 'get_forces'):
                    try:
                        forces = atoms.get_forces()
                        if forces is not None and len(forces) > i:
                            site["properties"]["force"] = forces[i].tolist()
                    except Exception:
                        pass  # Forces not available or calculation failed
                        
                structure_dict["sites"].append(site)
            
            # Add lattice information if available
            if atoms.cell is not None and atoms.cell.volume > 0:
                cell_matrix = atoms.cell.array.tolist()
                structure_dict["lattice"] = {
                    "matrix": cell_matrix,
                    "a": atoms.cell.lengths()[0],
                    "b": atoms.cell.lengths()[1], 
                    "c": atoms.cell.lengths()[2],
                    "alpha": atoms.cell.angles()[0],
                    "beta": atoms.cell.angles()[1],
                    "gamma": atoms.cell.angles()[2],
                    "volume": atoms.cell.volume,
                }
                
                # Convert xyz to fractional coordinates
                fractional = atoms.get_scaled_positions()
                for i, site in enumerate(structure_dict["sites"]):
                    site["abc"] = fractional[i].tolist()
            
            return structure_dict
            
        except ImportError as e:
            raise ImportError("ASE is required to convert Atoms objects") from e
    
    def _phonopy_to_dict(self, phonopy_atoms: Any) -> Dict[str, Any]:
        """Convert phonopy Atoms object to structure dictionary.""" 
        try:
            # Basic structure data
            structure_dict = {
                "sites": [],
                "charge": 0,
            }
            
            # Convert atomic data
            symbols = phonopy_atoms.get_chemical_symbols()
            positions = phonopy_atoms.get_scaled_positions()
            
            for i, (symbol, frac_pos) in enumerate(zip(symbols, positions)):
                # Convert fractional to cartesian coordinates
                cart_pos = phonopy_atoms.get_cell().T @ frac_pos
                
                site = {
                    "species": [{"element": symbol, "occu": 1.0}],
                    "abc": frac_pos.tolist(),
                    "xyz": cart_pos.tolist(),
                    "label": f"{symbol}{i}",
                    "properties": {}
                }
                structure_dict["sites"].append(site)
            
            # Add lattice information
            cell = phonopy_atoms.get_cell()
            structure_dict["lattice"] = {
                "matrix": cell.tolist(),
                "a": float(phonopy_atoms.get_cell_lengths()[0]),
                "b": float(phonopy_atoms.get_cell_lengths()[1]),
                "c": float(phonopy_atoms.get_cell_lengths()[2]),
                "alpha": float(phonopy_atoms.get_cell_angles()[0]),
                "beta": float(phonopy_atoms.get_cell_angles()[1]),
                "gamma": float(phonopy_atoms.get_cell_angles()[2]),
                "volume": float(phonopy_atoms.get_volume()),
            }
            
            return structure_dict
            
        except Exception as e:
            raise ValueError(f"Failed to convert phonopy Atoms object: {e}") from e

    def update_structure(self, new_structure: Union[Dict[str, Any], Any]) -> None:
        """Update the displayed structure.
        
        Args:
            new_structure: New structure data to display
        """
        self.structure = self._normalize_structure(new_structure)
        
    def set_view_options(
        self,
        *,
        atom_radius: Optional[float] = None,
        show_bonds: Optional[bool] = None,
        color_scheme: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        """Update visualization options.
        
        Args:
            atom_radius: Scale factor for atomic radii
            show_bonds: Whether to show chemical bonds
            color_scheme: Color scheme name (e.g., "Vesta", "Jmol", "Alloy")
            **kwargs: Additional view options
        """
        updates = {}
        
        if atom_radius is not None:
            updates["atom_radius"] = atom_radius
        if show_bonds is not None:
            updates["show_bonds"] = show_bonds
        if color_scheme is not None:
            updates["color_scheme"] = color_scheme
            
        # Add any additional kwargs
        updates.update(kwargs)
        
        # Apply all updates at once
        for key, value in updates.items():
            if hasattr(self, key):
                setattr(self, key, value)