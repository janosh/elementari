// Helper function to detect unsupported file formats and provide helpful messages
export function get_unsupported_format_message(
  filename: string,
  content: string,
): string | null {
  const lower_filename = filename.toLowerCase()

  // Check for binary ASE trajectory files
  if (lower_filename.endsWith(`.traj`)) {
    return create_format_error(`ASE Binary Trajectory`, filename, [
      {
        tool: `ASE`,
        code: `from ase.io import read, write
# Read ASE trajectory
traj = read('${filename}', index=':')
# Convert to multi-frame XYZ
write('${filename.replace(`.traj`, `.xyz`)}', traj)`,
      },
      {
        tool: `pymatgen`,
        code: `from pymatgen.io.ase import AseAtomsAdaptor
from ase.io import read
import json

# Read ASE trajectory and convert to pymatgen
traj = read('${filename}', index=':')
structures = [AseAtomsAdaptor.get_structure(atoms) for atoms in traj]

# Save as JSON for elementari
trajectory_data = {
    "frames": [{"structure": struct.as_dict(), "step": i} for i, struct in enumerate(structures)]
}
with open('${filename.replace(`.traj`, `.json`)}', 'w') as file:
    json.dump(trajectory_data, file)`,
      },
    ])
  }

  // Check for LAMMPS trajectory files
  if (
    lower_filename.endsWith(`.dump`) ||
    lower_filename.endsWith(`.lammpstrj`)
  ) {
    return create_format_error(`LAMMPS Trajectory`, filename, [
      {
        tool: `pymatgen`,
        code: `from pymatgen.io.lammps.data import LammpsData
# Convert LAMMPS trajectory to supported format
# (specific code depends on LAMMPS trajectory format)`,
      },
    ])
  }

  // Check for NetCDF files (common in MD simulations)
  if (lower_filename.endsWith(`.nc`) || lower_filename.endsWith(`.netcdf`)) {
    return create_format_error(`NetCDF Trajectory`, filename, [
      {
        tool: `MDAnalysis`,
        code: `import MDAnalysis as mda
# Convert NetCDF to XYZ format
u = mda.Universe('topology.pdb', '${filename}')
u.atoms.write('${filename.replace(/\.(nc|netcdf)$/, `.xyz`)}', frames='all')`,
      },
    ])
  }

  // Check for DCD files (CHARMM/NAMD trajectories) # codespell:ignore
  if (lower_filename.endsWith(`.dcd`)) {
    return create_format_error(`DCD Trajectory`, filename, [
      {
        tool: `MDAnalysis`,
        code: `import MDAnalysis as mda
# You'll need a topology file (PSF, PDB, etc.)
u = mda.Universe('topology.psf', '${filename}')
u.atoms.write('${filename.replace(`.dcd`, `.xyz`)}', frames='all')`,
      },
    ])
  }

  // Check if content looks like binary data
  if (content.length > 0 && is_binary(content)) {
    return `
      <div class="unsupported-format">
        <h4>🚫 Unsupported Format: Binary File</h4>
        <p>The file <code>${filename}</code> appears to be a binary file and cannot be parsed as text.</p>
        <div class="code-options">
          <h5>💡 Supported Formats:</h5>
          <ul>
            <li>Multi-frame XYZ files (text-based)</li>
            <li>Pymatgen trajectory JSON</li>
            <li>VASP XDATCAR files</li>
            <li>Compressed versions (.gz) of the above</li>
          </ul>
          <p>Please convert your trajectory to one of these text-based formats.</p>
        </div>
      </div>
    `
  }

  return null
}

// Simplified binary detection
function is_binary(content: string): boolean {
  return (
    content.includes(`\0`) ||
    (content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length /
      content.length >
      0.1 ||
    (content.match(/[\x20-\x7E]/g) || []).length / content.length < 0.7
  )
}

// Simplified format error creation
function create_format_error(
  format_name: string,
  filename: string,
  conversions: Array<{ tool: string; code: string }>,
): string {
  const conversion_html = conversions
    .map(
      ({ tool, code }) => `
        <div>
          <strong>${tool}:</strong>
          <pre class="language-python">${code}</pre>
        </div>`,
    )
    .join(``)

  return `
    <div class="unsupported-format">
      <h4>🚫 Unsupported Format: ${format_name}</h4>
      <p>The file <code>${filename}</code> appears to be a ${format_name.toLowerCase()} file, which is not directly supported.</p>
      <h5>💡 Conversion Options:</h5>
      <div class="code-options">
        ${conversion_html}
      </div>
    </div>
  `
}
