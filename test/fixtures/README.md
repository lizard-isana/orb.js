# Numerical reference fixtures

Reference data used by numerical tests belongs in this directory rather than
being copied into test code without context.

Every fixture must identify:

- `source`: publication, service, library, or upstream implementation
- `sourceVersion`: release/version, document edition, or query date
- `procedure`: enough detail to reproduce the values
- `instant`: timestamp or epoch together with its time scale
- `frame`: reference frame and equinox/orientation model
- `center`: coordinate origin
- `units`: units for every stored quantity
- `accuracy`: expected accuracy class or known model limitations
- `tolerance`: the assertion tolerance and its unit

Fixtures should contain source values, not values adjusted to make orb.js pass.
If a legacy result is intentionally frozen before a later correction, label it
as a baseline residual and keep the independent reference alongside it.

Large primary generation inputs do not belong here or in the npm package. They
are managed by the relevant reproducible generation tool.
