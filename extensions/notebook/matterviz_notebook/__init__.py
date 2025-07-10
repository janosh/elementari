"""MatterViz Jupyter/Marimo notebook extension for visualizing crystal structures and MD trajectories."""

from __future__ import annotations

from typing import TYPE_CHECKING

from .structure import StructureWidget
from .trajectory import TrajectoryWidget
from .mime import (
    register_mime_renderers,
    unregister_mime_renderers,
    is_ase_atoms,
    is_pymatgen_structure,
    is_phonopy_atoms,
)

if TYPE_CHECKING:
    from typing import Any

__version__ = "0.1.0"

__all__ = [
    "StructureWidget",
    "TrajectoryWidget", 
    "register_mime_renderers",
    "unregister_mime_renderers",
    "is_ase_atoms",
    "is_pymatgen_structure", 
    "is_phonopy_atoms",
]


def load_ipython_extension(ipython: Any) -> None:
    """Load the IPython extension and register MIME renderers."""
    register_mime_renderers(ipython)


def unload_ipython_extension(ipython: Any) -> None:
    """Unload the IPython extension and unregister MIME renderers."""
    unregister_mime_renderers(ipython)


# Auto-register when imported in Jupyter/IPython environments
try:
    from IPython import get_ipython
    
    ipython_instance = get_ipython()
    if ipython_instance is not None:
        load_ipython_extension(ipython_instance)
except ImportError:
    # Not in an IPython environment, skip auto-registration
    pass