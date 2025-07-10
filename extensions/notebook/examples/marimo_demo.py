"""
MatterViz Notebook Extension Demo - Marimo

This Marimo notebook demonstrates the capabilities of the MatterViz notebook extension
for visualizing crystal structures and molecular dynamics trajectories.

To run this notebook:
1. Install: pip install matterviz-notebook[all] marimo
2. Run: marimo run marimo_demo.py
"""

import marimo as mo
import matterviz_notebook
from matterviz_notebook import StructureWidget, TrajectoryWidget
import json
from pathlib import Path

# Try to import optional dependencies
try:
    from ase.io import read as ase_read
    from ase import Atoms
    ASE_AVAILABLE = True
except ImportError:
    ASE_AVAILABLE = False

try:
    from pymatgen.core import Structure
    PYMATGEN_AVAILABLE = True
except ImportError:
    PYMATGEN_AVAILABLE = False


def main():
    """Main function defining the Marimo notebook layout."""
    
    # Introduction
    mo.md("""
    # MatterViz Notebook Extension Demo
    
    This notebook demonstrates interactive 3D visualization of crystal structures 
    and molecular dynamics trajectories using the MatterViz notebook extension.
    
    Features:
    - 🔬 Automatic MIME rendering for ASE, pymatgen, and phonopy objects
    - 🎬 Interactive trajectory visualization with playback controls
    - 🎨 Multiple color schemes and visualization options
    - 📱 Responsive design that works in Jupyter and Marimo
    """)
    
    # Setup and imports
    setup_info = mo.md(f"""
    ## Setup Information
    
    - ASE Available: {'✅' if ASE_AVAILABLE else '❌'}
    - pymatgen Available: {'✅' if PYMATGEN_AVAILABLE else '❌'}
    - MatterViz Extension: ✅ Loaded
    
    {'Install missing dependencies with: `pip install ase pymatgen`' if not (ASE_AVAILABLE and PYMATGEN_AVAILABLE) else ''}
    """)
    
    # Load sample structures
    structures_dir = Path("../../src/site/structures")
    
    sample_structures = {
        "mp-1": "mp-1.json",
        "mp-1234": "mp-1234.json", 
        "BaTiO3": "BaTiO3-tetragonal.poscar",
        "quartz": "quartz-alpha.cif",
    }
    
    structures = {}
    for name, filename in sample_structures.items():
        filepath = structures_dir / filename
        if filepath.exists():
            if filename.endswith('.json'):
                with open(filepath) as f:
                    structures[name] = json.load(f)
            elif ASE_AVAILABLE:
                try:
                    atoms = ase_read(str(filepath))
                    structures[name] = atoms
                except Exception as e:
                    print(f"Could not load {filename}: {e}")
    
    structure_info = mo.md(f"**Loaded {len(structures)} structures:** {', '.join(structures.keys())}")
    
    # Structure selection
    if structures:
        structure_selector = mo.ui.dropdown(
            options=list(structures.keys()),
            value=list(structures.keys())[0],
            label="Select Structure:"
        )
        
        # Color scheme selection
        color_scheme_selector = mo.ui.dropdown(
            options=["Vesta", "Jmol", "Alloy", "Muted", "Pastel"],
            value="Vesta",
            label="Color Scheme:"
        )
        
        # Visualization options
        atom_radius_slider = mo.ui.slider(
            start=0.5, stop=2.0, step=0.1, value=1.0,
            label="Atom Radius:"
        )
        
        show_bonds_checkbox = mo.ui.checkbox(value=False, label="Show Bonds")
        show_labels_checkbox = mo.ui.checkbox(value=False, label="Show Site Labels")
        
        controls_section = mo.md("""
        ## Interactive Controls
        
        Customize the visualization using the controls below:
        """)
        
        # Create the structure widget based on selections
        if structure_selector.value and structure_selector.value in structures:
            selected_structure = structures[structure_selector.value]
            
            structure_widget = StructureWidget(
                structure=selected_structure,
                atom_radius=atom_radius_slider.value,
                show_bonds=show_bonds_checkbox.value,
                show_site_labels=show_labels_checkbox.value,
                color_scheme=color_scheme_selector.value,
                width=700,
                height=500,
                show_controls=True,
                show_info=True
            )
            
            structure_display = mo.md(f"""
            ### {structure_selector.value} Structure
            
            Displaying structure with:
            - Color scheme: {color_scheme_selector.value}
            - Atom radius: {atom_radius_slider.value}
            - Bonds: {'On' if show_bonds_checkbox.value else 'Off'}
            - Labels: {'On' if show_labels_checkbox.value else 'Off'}
            """)
            
        else:
            structure_widget = mo.md("*No structure selected*")
            structure_display = mo.md("")
    
    else:
        structure_selector = mo.md("*No structures available*")
        color_scheme_selector = mo.md("")
        atom_radius_slider = mo.md("")
        show_bonds_checkbox = mo.md("")
        show_labels_checkbox = mo.md("")
        controls_section = mo.md("*No structures available for demonstration*")
        structure_widget = mo.md("")
        structure_display = mo.md("")
    
    # Trajectory demonstration
    trajectories_section = mo.md("""
    ## Trajectory Visualization
    
    Load and visualize molecular dynamics trajectories with interactive playback controls.
    """)
    
    # Try to load a sample trajectory
    trajectories_dir = Path("../../src/site/trajectories")
    trajectory_files = [
        "mp-1184225.extxyz",
        "cyclohexane.xyz",
        "V8_Ta12_W71_Re8-mace-omat.xyz"
    ]
    
    trajectory_data = None
    for filename in trajectory_files:
        filepath = trajectories_dir / filename
        if filepath.exists() and ASE_AVAILABLE:
            try:
                trajectory_data = ase_read(str(filepath), ":")
                if len(trajectory_data) > 1:  # Ensure it's actually a trajectory
                    break
            except Exception:
                continue
    
    if trajectory_data and len(trajectory_data) > 1:
        # Display mode selection
        display_mode_selector = mo.ui.dropdown(
            options=[
                "structure+scatter",
                "structure+histogram", 
                "structure",
                "scatter",
                "histogram"
            ],
            value="structure+scatter",
            label="Display Mode:"
        )
        
        layout_selector = mo.ui.dropdown(
            options=["auto", "horizontal", "vertical"],
            value="auto",
            label="Layout:"
        )
        
        trajectory_widget = TrajectoryWidget(
            trajectory=trajectory_data,
            display_mode=display_mode_selector.value,
            layout=layout_selector.value,
            width=900,
            height=600,
            show_controls=True,
            atom_radius=1.0
        )
        
        trajectory_info = mo.md(f"""
        ### Trajectory Loaded Successfully
        
        - **Frames:** {len(trajectory_data)}
        - **Display Mode:** {display_mode_selector.value}
        - **Layout:** {layout_selector.value}
        
        Use the controls in the widget to play/pause and navigate through the trajectory.
        """)
        
    else:
        display_mode_selector = mo.md("")
        layout_selector = mo.md("")
        trajectory_widget = mo.md("""
        *No trajectory data available*
        
        To see trajectory visualization:
        1. Install ASE: `pip install ase`
        2. Ensure trajectory files are available in the structures directory
        """)
        trajectory_info = mo.md("")
    
    # Advanced features section
    advanced_section = mo.md("""
    ## Advanced Features
    
    ### Automatic MIME Rendering
    
    The extension automatically visualizes structures when they are displayed:
    
    ```python
    import matterviz_notebook
    from ase.io import read
    
    # This will automatically render
    atoms = read('structure.cif')
    atoms  # Automatically visualized!
    ```
    
    ### Programmatic Control
    
    ```python
    # Create and control widgets programmatically
    widget = StructureWidget(structure=my_structure)
    
    # Update visualization options
    widget.atom_radius = 1.5
    widget.color_scheme = "Jmol"
    widget.show_bonds = True
    
    # Or use the convenience method
    widget.set_view_options(
        atom_radius=1.5,
        color_scheme="Jmol", 
        show_bonds=True
    )
    ```
    
    ### Force Vectors
    
    If your structures contain force data, force vectors will be automatically displayed:
    
    ```python
    # Structures with force data automatically show vectors
    widget = StructureWidget(
        structure=atoms_with_forces,
        show_force_vectors=True,
        force_vector_scale=3.0,
        force_vector_color="#ff6b6b"
    )
    ```
    """)
    
    # Summary
    summary = mo.md("""
    ## Summary
    
    The MatterViz notebook extension provides:
    
    1. **Seamless Integration** - Works automatically with ASE, pymatgen, and phonopy
    2. **Rich Visualizations** - 3D WebGL rendering with interactive controls
    3. **Trajectory Support** - Full MD trajectory visualization with plots
    4. **Customizable** - Multiple color schemes, styling options
    5. **Interactive** - Real-time control via Python code
    6. **Cross-Platform** - Works in Jupyter, JupyterLab, and Marimo
    
    Perfect for materials science research, education, and data exploration!
    """)
    
    # Layout the notebook
    return [
        mo.md("# MatterViz Notebook Extension Demo"),
        setup_info,
        structure_info,
        controls_section,
        mo.hstack([structure_selector, color_scheme_selector]),
        mo.hstack([atom_radius_slider, show_bonds_checkbox, show_labels_checkbox]),
        structure_display,
        structure_widget,
        trajectories_section,
        mo.hstack([display_mode_selector, layout_selector]) if trajectory_data else mo.md(""),
        trajectory_info,
        trajectory_widget,
        advanced_section,
        summary
    ]


if __name__ == "__main__":
    # For running as a standard Python script
    print("This is a Marimo notebook. Run with: marimo run marimo_demo.py")
    print("Or convert to a regular Python script for testing.")
    
    # You can also test the widgets here if needed
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("Running basic tests...")
        
        # Test basic imports
        print("✓ Extension imported successfully")
        
        # Test widget creation
        try:
            widget = StructureWidget()
            print("✓ StructureWidget created successfully")
        except Exception as e:
            print(f"✗ StructureWidget creation failed: {e}")
        
        try:
            widget = TrajectoryWidget()
            print("✓ TrajectoryWidget created successfully")
        except Exception as e:
            print(f"✗ TrajectoryWidget creation failed: {e}")
        
        print("Basic tests completed!")