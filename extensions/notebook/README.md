# MatterViz Notebook Extension

Interactive visualization of crystal structures and molecular dynamics trajectories in Jupyter notebooks and Marimo, powered by [anywidget](https://anywidget.dev) and the MatterViz component library.

## Features

- 🔬 **Automatic Visualization**: Automatically renders ASE Atoms, pymatgen Structures, and phonopy Atoms objects
- 🎬 **Trajectory Support**: Interactive MD trajectory visualization with playback controls
- 🎨 **Rich 3D Graphics**: WebGL-powered 3D visualization with multiple color schemes
- 🎛️ **Interactive Controls**: Real-time manipulation of visualization parameters
- 📱 **Notebook Integration**: Seamless integration with Jupyter and Marimo notebooks
- 🎯 **Type Safety**: Fully typed Python and TypeScript interfaces

## Installation

```bash
pip install matterviz-notebook
```

### Optional Dependencies

For full functionality, install the optional dependencies for your preferred structure libraries:

```bash
# For ASE support
pip install matterviz-notebook[ase]

# For pymatgen support  
pip install matterviz-notebook[pymatgen]

# For phonopy support
pip install matterviz-notebook[phonopy]

# Install all optional dependencies
pip install matterviz-notebook[all]
```

## Quick Start

### Automatic MIME Rendering

The extension automatically registers MIME renderers for common structure types. Simply import the package and display your structures:

```python
import matterviz_notebook

# Import your favorite structure library
from ase.io import read
from pymatgen.core import Structure

# Structures are automatically visualized when displayed
atoms = read('structure.cif')
atoms  # This will render automatically!

structure = Structure.from_file('POSCAR')
structure  # This will also render automatically!
```

### Manual Widget Usage

For more control, use the widgets directly:

```python
from matterviz_notebook import StructureWidget, TrajectoryWidget

# Structure visualization
widget = StructureWidget(
    structure=atoms,
    atom_radius=0.8,
    show_bonds=True,
    color_scheme="Jmol"
)
widget

# Trajectory visualization
trajectory_widget = TrajectoryWidget(
    trajectory=trajectory_frames,
    display_mode="structure+scatter",
    layout="horizontal"
)
trajectory_widget
```

## Structure Visualization

The `StructureWidget` provides comprehensive 3D visualization of crystal structures:

### Basic Usage

```python
from matterviz_notebook import StructureWidget
from pymatgen.core import Structure

structure = Structure.from_file("my_structure.cif")
widget = StructureWidget(structure=structure)
widget
```

### Customization Options

```python
widget = StructureWidget(
    structure=structure,
    # Visualization options
    atom_radius=1.2,
    show_atoms=True,
    show_bonds=True,
    show_site_labels=True,
    show_image_atoms=True,
    show_force_vectors=True,  # If force data available
    
    # Visual styling
    color_scheme="Vesta",  # Options: "Vesta", "Jmol", "Alloy", etc.
    background_color="#f0f0f0",
    background_opacity=0.1,
    
    # Bonds and vectors
    bond_thickness=0.15,
    bond_color="#666666", 
    force_vector_scale=2.0,
    force_vector_color="#ff6b6b",
    
    # Unit cell
    cell_edge_opacity=0.8,
    cell_surface_opacity=0.1,
    show_vectors=True,
    
    # Widget configuration
    width=700,
    height=500,
    show_controls=True,
    show_info=True
)
```

### Interactive Methods

```python
# Update the structure
widget.update_structure(new_structure)

# Modify visualization options
widget.set_view_options(
    atom_radius=1.5,
    color_scheme="Jmol",
    show_bonds=True
)
```

## Trajectory Visualization

The `TrajectoryWidget` provides interactive visualization of molecular dynamics trajectories:

### Basic Usage

```python
from matterviz_notebook import TrajectoryWidget
from ase.io import read

# Read trajectory file
trajectory = read("trajectory.xyz", ":")  # List of ASE Atoms
widget = TrajectoryWidget(trajectory=trajectory)
widget
```

### Display Modes

```python
widget = TrajectoryWidget(
    trajectory=trajectory,
    display_mode="structure+scatter",  # Options below
    layout="horizontal"  # or "vertical", "auto"
)
```

Available display modes:
- `"structure+scatter"`: Structure view with property scatter plot
- `"structure+histogram"`: Structure view with property histogram  
- `"structure"`: Structure view only
- `"scatter"`: Scatter plot only
- `"histogram"`: Histogram only

### Advanced Configuration

```python
widget = TrajectoryWidget(
    trajectory=trajectory,
    
    # Layout and display
    display_mode="structure+scatter",
    layout="auto",  # Adapts to viewport aspect ratio
    
    # Playback control
    current_step_idx=0,
    
    # Structure visualization (passed to embedded Structure component)
    atom_radius=1.0,
    show_atoms=True,
    show_bonds=False,
    color_scheme="Vesta",
    
    # Plot configuration
    step_labels=10,  # Number of step labels on slider
    
    # Widget configuration
    width=900,
    height=600,
    show_controls=True,
    show_fullscreen_button=True
)
```

### Interactive Methods

```python
# Update trajectory
widget.update_trajectory(new_trajectory)

# Jump to specific step
widget.set_step(50)

# Modify display options
widget.set_view_options(
    display_mode="structure+histogram",
    layout="vertical",
    atom_radius=1.2
)

# Access trajectory information
print(f"Total frames: {widget.num_frames}")
current_structure = widget.current_structure
```

## Supported File Formats

The extension automatically handles various structure and trajectory formats through ASE, pymatgen, and phonopy:

### Structure Formats
- CIF (Crystallographic Information File)
- POSCAR/CONTCAR (VASP)
- XYZ (Extended XYZ with properties)
- JSON (pymatgen Structure dictionaries)
- Many others supported by ASE and pymatgen

### Trajectory Formats
- Multi-frame XYZ
- ASE trajectory files (.traj)
- VASP XDATCAR files
- HDF5 trajectory files
- JSON trajectory format

## MIME Type Integration

The extension registers MIME renderers that automatically visualize structures when they are the last expression in a notebook cell:

```python
# These will automatically render
ase_atoms = read('structure.cif')
ase_atoms

pymatgen_structure = Structure.from_file('POSCAR') 
pymatgen_structure

phonopy_atoms = phonopy.structure.atoms.PhonopyAtoms(...)
phonopy_atoms
```

To disable automatic rendering:

```python
import matterviz_notebook
matterviz_notebook.unregister_mime_renderers(get_ipython())
```

To re-enable:

```python
matterviz_notebook.register_mime_renderers(get_ipython())
```

## Programmatic Control

Both widgets support programmatic control for advanced use cases:

```python
import time
from IPython.display import display

# Create trajectory widget
widget = TrajectoryWidget(trajectory=trajectory)
display(widget)

# Animate through frames
for i in range(widget.num_frames):
    widget.set_step(i)
    time.sleep(0.1)  # Pause between frames
```

## Integration with Analysis Workflows

The widgets integrate seamlessly with common materials science workflows:

```python
from ase.io import read
from ase.md import VelocityVerlet
from ase.calculators.emt import EMT
import numpy as np

# Set up MD simulation
atoms = read('initial_structure.xyz')
atoms.calc = EMT()

# Run MD and collect trajectory
trajectory_frames = []
md = VelocityVerlet(atoms, timestep=1.0)

for i in range(100):
    md.run(10)  # Run 10 steps
    trajectory_frames.append(atoms.copy())

# Visualize the trajectory
widget = TrajectoryWidget(
    trajectory=trajectory_frames,
    display_mode="structure+scatter",
    show_force_vectors=True
)
widget
```

## Color Schemes

Available color schemes:
- `"Vesta"`: Default VESTA colors
- `"Jmol"`: Jmol molecular viewer colors  
- `"Alloy"`: High-contrast colors for alloys
- `"Muted"`: Muted/pastel colors
- `"Pastel"`: Light pastel colors

## Browser Compatibility

The extension works in all modern browsers that support WebGL:
- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 79+

## Development

To set up for development:

```bash
git clone https://github.com/janosh/matterviz
cd matterviz/extensions/notebook

# Install dependencies
pip install -e ".[dev]"
npm install

# Build frontend
npm run build

# Run tests
pytest
npm test
```

## Contributing

Contributions are welcome! Please see the main [MatterViz repository](https://github.com/janosh/matterviz) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Citation

If you use MatterViz in your research, please cite:

```bibtex
@software{riebesell2024matterviz,
  title={MatterViz: Interactive 3D visualization of crystal structures and molecular dynamics},
  author={Riebesell, Janosh},
  year={2024},
  url={https://github.com/janosh/matterviz}
}
```