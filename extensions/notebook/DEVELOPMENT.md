# MatterViz Notebook Extension Development

This directory contains the MatterViz notebook extension for Jupyter and Marimo notebooks, built using [anywidget](https://anywidget.dev).

## Project Structure

```
extensions/notebook/
├── pyproject.toml          # Python package configuration
├── package.json            # Node.js dependencies and scripts
├── vite.config.ts          # Vite bundler configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
├── README.md               # User documentation
├── LICENSE                 # MIT license
│
├── matterviz_notebook/     # Python package
│   ├── __init__.py         # Main module exports
│   ├── structure.py        # StructureWidget class
│   ├── trajectory.py       # TrajectoryWidget class
│   ├── mime.py             # MIME type handlers
│   └── static/             # Built frontend assets (generated)
│       ├── index.js        # Bundled JavaScript
│       └── style.css       # Bundled CSS
│
├── src/                    # Frontend TypeScript/Svelte source
│   ├── index.ts            # Main entry point
│   ├── index.test.ts       # Frontend tests
│   ├── StructureApp.svelte # Structure widget wrapper
│   └── TrajectoryApp.svelte # Trajectory widget wrapper
│
├── tests/                  # Python tests
│   ├── setup.ts            # Test setup for vitest
│   └── test_widgets.py     # Widget tests
│
└── examples/               # Example notebooks
    ├── jupyter_demo.ipynb  # Jupyter demo
    └── marimo_demo.py      # Marimo demo
```

## Architecture

The extension consists of three main layers:

### 1. Python Layer (`matterviz_notebook/`)

- **StructureWidget**: Anywidget for visualizing crystal structures
- **TrajectoryWidget**: Anywidget for visualizing MD trajectories  
- **MIME handlers**: Automatic rendering for ASE, pymatgen, phonopy objects

### 2. Frontend Layer (`src/`)

- **index.ts**: Main anywidget render function
- **StructureApp.svelte**: Wrapper for Structure.svelte component
- **TrajectoryApp.svelte**: Wrapper for Trajectory.svelte component

### 3. Shared Components (`../../src/lib/`)

- Reuses the core MatterViz Svelte components
- Structure.svelte and Trajectory.svelte provide the visualization

## Development Setup

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- Git

### 1. Clone Repository

```bash
git clone https://github.com/janosh/matterviz
cd matterviz/extensions/notebook
```

### 2. Install Dependencies

```bash
# Install Python dependencies
pip install -e ".[dev]"

# Install Node.js dependencies  
npm install
```

### 3. Build Frontend

```bash
# Build once
npm run build

# Watch for changes during development
npm run dev
```

### 4. Install in Development Mode

```bash
# Install the Python package in editable mode
pip install -e .
```

## Development Workflow

### Frontend Development

The frontend code is written in TypeScript and Svelte:

1. **Edit source files** in `src/`
2. **Run build watcher**: `npm run dev`
3. **Test in notebook**: Create a new notebook and test your widgets

Key files:
- `src/index.ts`: Main entry point, handles model detection and rendering
- `src/StructureApp.svelte`: Wrapper for Structure component
- `src/TrajectoryApp.svelte`: Wrapper for Trajectory component

### Python Development

The Python code defines the widget classes and MIME handlers:

1. **Edit Python files** in `matterviz_notebook/`
2. **Run tests**: `pytest`
3. **Test in notebook**: Import and use the widgets

Key files:
- `structure.py`: StructureWidget with traitlets for property sync
- `trajectory.py`: TrajectoryWidget with trajectory handling
- `mime.py`: Automatic MIME type detection and rendering

### Adding New Features

To add a new visualization option:

1. **Add Python property** to widget class with `t.Bool()`, `t.Float()`, etc.
2. **Update frontend** to read the property from model
3. **Pass to Svelte component** in the props object
4. **Update tests** to cover the new functionality

Example:

```python
# In structure.py
show_new_feature = t.Bool(False).tag(sync=True)
```

```typescript
// In src/index.ts
const getProps = () => ({
  // ... existing props
  show_new_feature: model.get('show_new_feature'),
})
```

## Testing

### Python Tests

```bash
# Run all Python tests
pytest

# Run with coverage
pytest --cov=matterviz_notebook

# Run specific test file
pytest tests/test_widgets.py
```

### Frontend Tests

```bash
# Run frontend tests
npm test

# Watch mode for development
npm run test:watch
```

### Integration Testing

Test the full integration by running the example notebooks:

```bash
# Jupyter
jupyter notebook examples/jupyter_demo.ipynb

# Marimo
marimo run examples/marimo_demo.py
```

## Building and Publishing

### Build for Distribution

```bash
# Clean previous builds
rm -rf dist/ build/ matterviz_notebook/static/

# Install build dependencies
pip install build

# Build frontend assets
npm run build

# Build Python package
python -m build
```

### Publish to PyPI

```bash
# Install publishing tools
pip install twine

# Upload to test PyPI first
twine upload --repository testpypi dist/*

# Upload to PyPI
twine upload dist/*
```

## Common Issues

### Frontend Build Issues

**Problem**: Vite build fails with module resolution errors
**Solution**: Check that the `$lib` alias in `vite.config.ts` points to the correct path

**Problem**: Svelte components not rendering
**Solution**: Ensure the components are properly imported and the Canvas API is available

### Python Import Issues

**Problem**: `ImportError` when importing widgets
**Solution**: Check that the frontend assets are built and in `matterviz_notebook/static/`

**Problem**: MIME renderers not working
**Solution**: Ensure the extension is imported: `import matterviz_notebook`

### WebGL Issues

**Problem**: "WebGL not supported" errors in notebooks
**Solution**: Check browser compatibility and ensure notebooks are served over HTTPS if needed

## Debugging

### Frontend Debugging

1. **Browser DevTools**: Open browser console to see JavaScript errors
2. **Network Tab**: Check if static assets are loading correctly
3. **Vite Source Maps**: Use `npm run dev` for source map support

### Python Debugging

1. **Print statements**: Add debug prints in widget methods
2. **Jupyter logs**: Check Jupyter server logs for Python errors
3. **IPython debugging**: Use `%debug` magic for post-mortem debugging

### Widget Communication

The anywidget framework handles bidirectional communication between Python and JavaScript:

- **Python → JS**: Changes to traitlet properties automatically sync to frontend
- **JS → Python**: Use `model.set()` and `model.save_changes()` in frontend

Debug communication issues by:
1. Checking that properties have `.tag(sync=True)`
2. Verifying event handlers are registered correctly
3. Using browser console to inspect model state

## Performance Tips

### Frontend Performance

- **Lazy loading**: Only render complex visualizations when needed
- **Debouncing**: Debounce rapid property changes
- **Memory management**: Properly dispose of Three.js objects

### Python Performance

- **Structure caching**: Cache expensive structure conversions
- **Lazy imports**: Import heavy dependencies only when needed
- **Batch updates**: Update multiple properties together

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Make changes** following the development workflow
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Submit pull request**

### Code Style

- **Python**: Follow PEP 8, use black for formatting
- **TypeScript**: Follow the existing style, use prettier
- **Commit messages**: Use conventional commits format

### Review Checklist

Before submitting a PR:

- [ ] All tests pass
- [ ] Frontend builds without errors
- [ ] Example notebooks work correctly
- [ ] Documentation is updated
- [ ] Type hints are provided for Python code
- [ ] No console errors in browser

## Resources

- [anywidget Documentation](https://anywidget.dev)
- [Jupyter Widgets Documentation](https://ipywidgets.readthedocs.io)
- [Svelte Documentation](https://svelte.dev)
- [Three.js Documentation](https://threejs.org/docs)
- [Vite Documentation](https://vitejs.dev)

## License

MIT License - see [LICENSE](LICENSE) for details.