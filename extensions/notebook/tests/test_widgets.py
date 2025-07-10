"""
Tests for the MatterViz notebook extension widgets.
"""

from __future__ import annotations

import json
import pytest
from pathlib import Path
from typing import Any, Dict

from matterviz_notebook import StructureWidget, TrajectoryWidget
from matterviz_notebook.mime import (
    is_ase_atoms,
    is_pymatgen_structure,
    is_phonopy_atoms,
    is_trajectory_like,
    structure_to_html,
    trajectory_to_html,
)


class TestStructureWidget:
    """Test the StructureWidget class."""

    def test_init_empty(self) -> None:
        """Test creating a widget with no structure."""
        widget = StructureWidget()
        assert widget.structure is None
        assert widget.atom_radius == 1.0
        assert widget.show_atoms is True
        assert widget.width == 600
        assert widget.height == 500

    def test_init_with_dict(self) -> None:
        """Test creating a widget with a structure dictionary."""
        structure_dict = {
            "sites": [
                {
                    "species": [{"element": "C", "occu": 1.0}],
                    "abc": [0.0, 0.0, 0.0],
                    "xyz": [0.0, 0.0, 0.0],
                    "label": "C0",
                    "properties": {}
                }
            ],
            "charge": 0
        }
        
        widget = StructureWidget(structure=structure_dict)
        assert widget.structure == structure_dict
        assert len(widget.structure["sites"]) == 1

    def test_init_with_options(self) -> None:
        """Test creating a widget with custom options."""
        widget = StructureWidget(
            atom_radius=1.5,
            show_bonds=True,
            color_scheme="Jmol",
            width=800,
            height=600
        )
        
        assert widget.atom_radius == 1.5
        assert widget.show_bonds is True
        assert widget.color_scheme == "Jmol"
        assert widget.width == 800
        assert widget.height == 600

    def test_update_structure(self) -> None:
        """Test updating the structure after creation."""
        widget = StructureWidget()
        assert widget.structure is None
        
        new_structure = {
            "sites": [
                {
                    "species": [{"element": "H", "occu": 1.0}],
                    "abc": [0.0, 0.0, 0.0],
                    "xyz": [0.0, 0.0, 0.0],
                    "label": "H0",
                    "properties": {}
                }
            ],
            "charge": 0
        }
        
        widget.update_structure(new_structure)
        assert widget.structure == new_structure

    def test_set_view_options(self) -> None:
        """Test setting view options."""
        widget = StructureWidget()
        
        widget.set_view_options(
            atom_radius=2.0,
            show_bonds=True,
            color_scheme="Alloy"
        )
        
        assert widget.atom_radius == 2.0
        assert widget.show_bonds is True
        assert widget.color_scheme == "Alloy"

    @pytest.mark.skipif(not _ase_available(), reason="ASE not available")
    def test_ase_structure_conversion(self) -> None:
        """Test converting ASE Atoms to structure dict."""
        from ase import Atoms
        
        atoms = Atoms('H2O', positions=[[0, 0, 0], [0, 0, 1.1], [0, 1.1, 0]])
        widget = StructureWidget(structure=atoms)
        
        assert widget.structure is not None
        assert "sites" in widget.structure
        assert len(widget.structure["sites"]) == 3

    @pytest.mark.skipif(not _pymatgen_available(), reason="pymatgen not available")
    def test_pymatgen_structure_conversion(self) -> None:
        """Test converting pymatgen Structure to dict."""
        from pymatgen.core import Structure, Lattice
        
        lattice = Lattice.cubic(4.0)
        structure = Structure(lattice, ["Na", "Cl"], [[0, 0, 0], [0.5, 0.5, 0.5]])
        
        widget = StructureWidget(structure=structure)
        
        assert widget.structure is not None
        assert "sites" in widget.structure
        assert "lattice" in widget.structure
        assert len(widget.structure["sites"]) == 2


class TestTrajectoryWidget:
    """Test the TrajectoryWidget class."""

    def test_init_empty(self) -> None:
        """Test creating a trajectory widget with no data."""
        widget = TrajectoryWidget()
        assert widget.trajectory is None
        assert widget.current_step_idx == 0
        assert widget.display_mode == "structure+scatter"
        assert widget.width == 800
        assert widget.height == 600

    def test_init_with_dict(self) -> None:
        """Test creating a widget with trajectory dictionary."""
        trajectory_dict = {
            "frames": [
                {
                    "structure": {
                        "sites": [
                            {
                                "species": [{"element": "C", "occu": 1.0}],
                                "abc": [0.0, 0.0, 0.0],
                                "xyz": [0.0, 0.0, 0.0],
                                "label": "C0",
                                "properties": {}
                            }
                        ],
                        "charge": 0
                    },
                    "metadata": {"step": 0}
                }
            ],
            "metadata": {}
        }
        
        widget = TrajectoryWidget(trajectory=trajectory_dict)
        assert widget.trajectory == trajectory_dict
        assert widget.num_frames == 1

    def test_init_with_structure_list(self) -> None:
        """Test creating a widget with a list of structures."""
        structures = [
            {
                "sites": [
                    {
                        "species": [{"element": "H", "occu": 1.0}],
                        "abc": [0.0, 0.0, 0.0],
                        "xyz": [0.0, 0.0, 0.0],
                        "label": "H0",
                        "properties": {}
                    }
                ],
                "charge": 0
            },
            {
                "sites": [
                    {
                        "species": [{"element": "He", "occu": 1.0}],
                        "abc": [0.0, 0.0, 0.0],
                        "xyz": [0.0, 0.0, 0.0],
                        "label": "He0",
                        "properties": {}
                    }
                ],
                "charge": 0
            }
        ]
        
        widget = TrajectoryWidget(trajectory=structures)
        assert widget.trajectory is not None
        assert "frames" in widget.trajectory
        assert widget.num_frames == 2

    def test_set_step(self) -> None:
        """Test setting the current step."""
        structures = [{"sites": [], "charge": 0}] * 5
        widget = TrajectoryWidget(trajectory=structures)
        
        widget.set_step(3)
        assert widget.current_step_idx == 3
        
        # Test bounds checking
        widget.set_step(10)  # Beyond max
        assert widget.current_step_idx == 4  # Should clamp to max
        
        widget.set_step(-1)  # Below min
        assert widget.current_step_idx == 0  # Should clamp to min

    def test_update_trajectory(self) -> None:
        """Test updating the trajectory after creation."""
        widget = TrajectoryWidget()
        assert widget.num_frames == 0
        
        new_trajectory = [{"sites": [], "charge": 0}] * 3
        widget.update_trajectory(new_trajectory)
        
        assert widget.num_frames == 3
        assert widget.current_step_idx == 0  # Should reset

    def test_set_view_options(self) -> None:
        """Test setting view options."""
        widget = TrajectoryWidget()
        
        widget.set_view_options(
            display_mode="structure",
            layout="vertical",
            atom_radius=1.5,
            color_scheme="Jmol"
        )
        
        assert widget.display_mode == "structure"
        assert widget.layout == "vertical"
        assert widget.atom_radius == 1.5
        assert widget.color_scheme == "Jmol"

    def test_current_structure_property(self) -> None:
        """Test accessing the current structure."""
        structures = [
            {"sites": [{"element": "H"}], "charge": 0},
            {"sites": [{"element": "He"}], "charge": 0}
        ]
        widget = TrajectoryWidget(trajectory=structures)
        
        widget.set_step(0)
        current = widget.current_structure
        assert current is not None
        
        widget.set_step(1)
        current = widget.current_structure
        assert current is not None

    @pytest.mark.skipif(not _ase_available(), reason="ASE not available")
    def test_ase_trajectory_conversion(self) -> None:
        """Test converting list of ASE Atoms to trajectory."""
        from ase import Atoms
        
        atoms_list = [
            Atoms('H', positions=[[0, 0, 0]]),
            Atoms('H', positions=[[0, 0, 0.1]]),
            Atoms('H', positions=[[0, 0, 0.2]])
        ]
        
        widget = TrajectoryWidget(trajectory=atoms_list)
        
        assert widget.trajectory is not None
        assert widget.num_frames == 3
        assert "frames" in widget.trajectory


class TestMimeDetection:
    """Test MIME type detection functions."""

    def test_is_ase_atoms(self) -> None:
        """Test ASE Atoms detection."""
        # Test with non-ASE object
        assert not is_ase_atoms("not an atoms object")
        assert not is_ase_atoms({"some": "dict"})
        
        # Test with ASE object if available
        if _ase_available():
            from ase import Atoms
            atoms = Atoms('H', positions=[[0, 0, 0]])
            assert is_ase_atoms(atoms)

    def test_is_pymatgen_structure(self) -> None:
        """Test pymatgen Structure detection."""
        # Test with non-pymatgen object
        assert not is_pymatgen_structure("not a structure")
        assert not is_pymatgen_structure({"some": "dict"})
        
        # Test with pymatgen object if available
        if _pymatgen_available():
            from pymatgen.core import Structure, Lattice
            lattice = Lattice.cubic(4.0)
            structure = Structure(lattice, ["H"], [[0, 0, 0]])
            assert is_pymatgen_structure(structure)

    def test_is_phonopy_atoms(self) -> None:
        """Test phonopy Atoms detection."""
        # Test with non-phonopy object
        assert not is_phonopy_atoms("not atoms")
        assert not is_phonopy_atoms({"some": "dict"})

    def test_is_trajectory_like(self) -> None:
        """Test trajectory-like object detection."""
        # Test non-trajectory objects
        assert not is_trajectory_like("not a list")
        assert not is_trajectory_like({})
        assert not is_trajectory_like([])  # Empty list
        
        # Test list of dicts (should be detected as trajectory-like)
        structures = [
            {"sites": [], "charge": 0},
            {"sites": [], "charge": 0}
        ]
        assert is_trajectory_like(structures)
        
        # Test mixed types (should not be trajectory-like)
        mixed_list = [{"sites": []}, "not a structure", 123]
        assert not is_trajectory_like(mixed_list)

    def test_structure_to_html(self) -> None:
        """Test structure to HTML conversion."""
        structure = {
            "sites": [
                {
                    "species": [{"element": "H", "occu": 1.0}],
                    "abc": [0.0, 0.0, 0.0],
                    "xyz": [0.0, 0.0, 0.0],
                    "label": "H0",
                    "properties": {}
                }
            ],
            "charge": 0
        }
        
        html = structure_to_html(structure)
        assert isinstance(html, str)
        assert "matterviz-structure-" in html
        assert "script" in html

    def test_trajectory_to_html(self) -> None:
        """Test trajectory to HTML conversion."""
        trajectory = [
            {"sites": [], "charge": 0},
            {"sites": [], "charge": 0}
        ]
        
        html = trajectory_to_html(trajectory)
        assert isinstance(html, str)
        assert "matterviz-trajectory-" in html
        assert "script" in html


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_invalid_structure_format(self) -> None:
        """Test handling of invalid structure formats."""
        with pytest.raises(ValueError, match="Unsupported structure type"):
            StructureWidget(structure="invalid structure")

    def test_invalid_trajectory_format(self) -> None:
        """Test handling of invalid trajectory formats."""
        with pytest.raises(ValueError, match="Unsupported trajectory type"):
            TrajectoryWidget(trajectory="invalid trajectory")

    def test_empty_trajectory_list(self) -> None:
        """Test handling of empty trajectory list."""
        with pytest.raises(ValueError, match="Empty structure list"):
            TrajectoryWidget(trajectory=[])

    def test_structure_normalization_failure(self) -> None:
        """Test handling when structure normalization fails."""
        # This should trigger the ValueError in _normalize_structure
        invalid_structures = [None, "invalid"]
        
        with pytest.raises(ValueError, match="Could not normalize structure"):
            TrajectoryWidget(trajectory=invalid_structures)


# Integration tests with sample data
class TestIntegration:
    """Integration tests using sample data."""
    
    @pytest.fixture
    def sample_structure_dict(self) -> Dict[str, Any]:
        """Sample structure dictionary for testing."""
        return {
            "sites": [
                {
                    "species": [{"element": "Na", "occu": 1.0}],
                    "abc": [0.0, 0.0, 0.0],
                    "xyz": [0.0, 0.0, 0.0],
                    "label": "Na0",
                    "properties": {}
                },
                {
                    "species": [{"element": "Cl", "occu": 1.0}],
                    "abc": [0.5, 0.5, 0.5],
                    "xyz": [2.0, 2.0, 2.0],
                    "label": "Cl0",
                    "properties": {}
                }
            ],
            "charge": 0,
            "lattice": {
                "matrix": [[4.0, 0.0, 0.0], [0.0, 4.0, 0.0], [0.0, 0.0, 4.0]],
                "a": 4.0,
                "b": 4.0,
                "c": 4.0,
                "alpha": 90.0,
                "beta": 90.0,
                "gamma": 90.0,
                "volume": 64.0
            }
        }

    def test_structure_widget_with_sample_data(self, sample_structure_dict: Dict[str, Any]) -> None:
        """Test StructureWidget with realistic structure data."""
        widget = StructureWidget(
            structure=sample_structure_dict,
            show_bonds=True,
            color_scheme="Jmol",
            width=700,
            height=500
        )
        
        assert widget.structure == sample_structure_dict
        assert widget.show_bonds is True
        assert widget.color_scheme == "Jmol"
        
        # Test updating visualization options
        widget.set_view_options(
            atom_radius=1.5,
            show_site_labels=True,
            background_color="#f0f0f0"
        )
        
        assert widget.atom_radius == 1.5
        assert widget.show_site_labels is True
        assert widget.background_color == "#f0f0f0"

    def test_trajectory_widget_with_sample_data(self, sample_structure_dict: Dict[str, Any]) -> None:
        """Test TrajectoryWidget with realistic trajectory data."""
        # Create a simple trajectory by modifying the sample structure
        trajectory_frames = []
        for i in range(5):
            frame_structure = sample_structure_dict.copy()
            # Slightly modify positions to simulate dynamics
            for j, site in enumerate(frame_structure["sites"]):
                site = site.copy()
                site["xyz"] = [coord + i * 0.1 for coord in site["xyz"]]
                frame_structure["sites"][j] = site
            trajectory_frames.append(frame_structure)
        
        widget = TrajectoryWidget(
            trajectory=trajectory_frames,
            display_mode="structure+scatter",
            layout="horizontal",
            width=900,
            height=600
        )
        
        assert widget.num_frames == 5
        assert widget.display_mode == "structure+scatter"
        assert widget.layout == "horizontal"
        
        # Test navigation
        widget.set_step(2)
        assert widget.current_step_idx == 2
        
        current_structure = widget.current_structure
        assert current_structure is not None
        assert len(current_structure["sites"]) == 2


# Helper functions
def _ase_available() -> bool:
    """Check if ASE is available."""
    try:
        import ase
        return True
    except ImportError:
        return False


def _pymatgen_available() -> bool:
    """Check if pymatgen is available."""
    try:
        import pymatgen
        return True
    except ImportError:
        return False