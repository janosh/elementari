"""MIME type handling for automatic structure and trajectory visualization."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from typing import Any as AnyType


def is_ase_atoms(obj: Any) -> bool:
    """Check if an object is an ASE Atoms instance."""
    try:
        from ase import Atoms
        return isinstance(obj, Atoms)
    except ImportError:
        return False


def is_pymatgen_structure(obj: Any) -> bool:
    """Check if an object is a pymatgen Structure instance."""
    try:
        from pymatgen.core import Structure, IStructure
        return isinstance(obj, (Structure, IStructure))
    except ImportError:
        return False


def is_phonopy_atoms(obj: Any) -> bool:
    """Check if an object is a phonopy Atoms instance."""
    try:
        from phonopy import Atoms
        return isinstance(obj, Atoms)
    except ImportError:
        return False


def is_trajectory_like(obj: Any) -> bool:
    """Check if an object represents a trajectory (list of structures)."""
    if not isinstance(obj, (list, tuple)):
        return False
        
    if len(obj) == 0:
        return False
        
    # Check if all items are structure-like
    return all(
        is_ase_atoms(item) or is_pymatgen_structure(item) or isinstance(item, dict)
        for item in obj
    )


def structure_to_html(obj: Any) -> str:
    """Convert a structure object to HTML for display."""
    try:
        from .structure import StructureWidget
        
        # Create widget and get its HTML representation
        widget = StructureWidget(structure=obj)
        
        # For MIME rendering, we need to return HTML that will embed the widget
        html = f"""
        <div id="matterviz-structure-{id(obj)}" style="width: 100%; height: 500px;">
            <script type="module">
                import {{ render }} from "https://esm.sh/@anywidget/embed@0.1.3";
                
                const widgetEl = document.getElementById("matterviz-structure-{id(obj)}");
                
                render({{
                    esm: `{widget._esm}`,
                    css: `{widget._css}`,
                    model: {{
                        structure: {widget.structure},
                        atom_radius: {widget.atom_radius},
                        show_atoms: {widget.show_atoms},
                        show_bonds: {widget.show_bonds},
                        show_site_labels: {widget.show_site_labels},
                        show_image_atoms: {widget.show_image_atoms},
                        color_scheme: "{widget.color_scheme}",
                        width: {widget.width},
                        height: {widget.height}
                    }}
                }}, widgetEl);
            </script>
        </div>
        """
        return html
        
    except Exception as e:
        return f"<div>Error rendering structure: {e}</div>"


def trajectory_to_html(obj: Any) -> str:
    """Convert a trajectory object to HTML for display."""
    try:
        from .trajectory import TrajectoryWidget
        
        # Create widget
        widget = TrajectoryWidget(trajectory=obj)
        
        # For MIME rendering, we need to return HTML that will embed the widget
        html = f"""
        <div id="matterviz-trajectory-{id(obj)}" style="width: 100%; height: 600px;">
            <script type="module">
                import {{ render }} from "https://esm.sh/@anywidget/embed@0.1.3";
                
                const widgetEl = document.getElementById("matterviz-trajectory-{id(obj)}");
                
                render({{
                    esm: `{widget._esm}`,
                    css: `{widget._css}`,
                    model: {{
                        trajectory: {widget.trajectory},
                        current_step_idx: {widget.current_step_idx},
                        layout: "{widget.layout}",
                        display_mode: "{widget.display_mode}",
                        show_controls: {widget.show_controls},
                        width: {widget.width},
                        height: {widget.height}
                    }}
                }}, widgetEl);
            </script>
        </div>
        """
        return html
        
    except Exception as e:
        return f"<div>Error rendering trajectory: {e}</div>"


def ase_atoms_formatter(obj: Any, include: Any, exclude: Any) -> Optional[str]:
    """IPython formatter for ASE Atoms objects."""
    if not is_ase_atoms(obj):
        return None
    return structure_to_html(obj)


def pymatgen_structure_formatter(obj: Any, include: Any, exclude: Any) -> Optional[str]:
    """IPython formatter for pymatgen Structure objects."""
    if not is_pymatgen_structure(obj):
        return None
    return structure_to_html(obj)


def phonopy_atoms_formatter(obj: Any, include: Any, exclude: Any) -> Optional[str]:
    """IPython formatter for phonopy Atoms objects."""
    if not is_phonopy_atoms(obj):
        return None
    return structure_to_html(obj)


def trajectory_formatter(obj: Any, include: Any, exclude: Any) -> Optional[str]:
    """IPython formatter for trajectory objects (lists of structures)."""
    if not is_trajectory_like(obj):
        return None
    return trajectory_to_html(obj)


def register_mime_renderers(ipython: AnyType) -> None:
    """Register MIME renderers for automatic structure/trajectory visualization.
    
    Args:
        ipython: IPython instance
    """
    # Get the HTML formatter
    html_formatter = ipython.display_formatter.formatters['text/html']
    
    # Register formatters for different structure types
    try:
        from ase import Atoms
        html_formatter.for_type(Atoms, ase_atoms_formatter)
    except ImportError:
        pass
        
    try:
        from pymatgen.core import Structure, IStructure
        html_formatter.for_type(Structure, pymatgen_structure_formatter)
        html_formatter.for_type(IStructure, pymatgen_structure_formatter)
    except ImportError:
        pass
        
    try:
        from phonopy import Atoms
        html_formatter.for_type(Atoms, phonopy_atoms_formatter)
    except ImportError:
        pass
    
    # Register trajectory formatter for lists
    # Note: This is more challenging since we can't register for generic list types
    # Users will need to use the TrajectoryWidget directly for trajectory data
    
    print("MatterViz MIME renderers registered for automatic structure visualization")


def unregister_mime_renderers(ipython: AnyType) -> None:
    """Unregister MIME renderers.
    
    Args:
        ipython: IPython instance
    """
    # Get the HTML formatter
    html_formatter = ipython.display_formatter.formatters['text/html']
    
    # Unregister formatters
    try:
        from ase import Atoms
        html_formatter.pop(Atoms, None)
    except ImportError:
        pass
        
    try:
        from pymatgen.core import Structure, IStructure
        html_formatter.pop(Structure, None)
        html_formatter.pop(IStructure, None)
    except ImportError:
        pass
        
    try:
        from phonopy import Atoms
        html_formatter.pop(Atoms, None)
    except ImportError:
        pass
    
    print("MatterViz MIME renderers unregistered")