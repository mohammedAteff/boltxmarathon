# BOLTX Challenge Games

Private Spin Wheel and Mystery Boxes challenges, with an authenticated control room and scoped play and display links.

## Run locally

1. Install PHP 8.2+ with PDO MySQL, mbstring and GD, and start a MySQL or MariaDB server.
2. Create an empty database called `boltx` using `utf8mb4`. Import `schema.sql` as a database administrator. Optionally import `demo.sql` once to load four sample players, seven drink types and fifteen Arabic challenges. The demo starts with sealed boxes.
3. Create a dedicated database account with `SELECT, INSERT, UPDATE, DELETE` on this database. Set these environment variables in the PHP process. For example, in PowerShell:

   ```powershell
   $env:BOLTX_DSN = 'mysql:host=127.0.0.1;port=3306;dbname=boltx;charset=utf8mb4'
   $env:BOLTX_DB_USER = 'boltx'
   $env:BOLTX_DB_PASSWORD = Read-Host 'Database password' -MaskInput
   ```

4. Create an operator account from the project directory. Use a unique 12–72 byte password. This command sends it through stdin:

   ```powershell
   (Read-Host 'Operator password' -MaskInput) | php setup-admin.php operator
   ```

5. Run `php migrate-v2.php` and then `php -S 127.0.0.1:8017 -t public`. Open [the launcher](http://127.0.0.1:8017/) or [the control room](http://127.0.0.1:8017/admin/).

For hosted use, configure the web server document root to the project's **public/** directory, run PHP over HTTPS, and set the database variables in the PHP service environment. Keep the schema, setup script, tests and configuration outside the web root. Back up the database; it contains the live state, event history, and re-encoded avatar images.

For Hostinger shared hosting, deploy the repository to `public_html/boltxmarathon`. Keep the included `.htaccess` in that directory. It rewrites the game and dashboard URLs into `public/` and blocks direct requests for the schema, configuration and repository files.

Create a dedicated database and import `schema.sql`, followed by `demo.sql` if you want starter content. If PHP service environment variables are unavailable, create the Git-ignored `config.local.php` on the server next to `config.php` with this structure:

```php
<?php
return [
    'dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
    'user' => 'YOUR_DATABASE_USER',
    'password' => 'YOUR_DATABASE_PASSWORD',
];
```

From the application directory over SSH, run the following to create the operator. The password is entered without echo and passed via stdin.

```bash
read -rsp 'Operator password: ' boltx_password
printf '%s\n' "$boltx_password" | php setup-admin.php admin
unset boltx_password
```

For an existing multi-game install, back up the database and run `php migrate-v2.php` before serving the upgraded code. The migration can run again safely. Existing wheels, boxes, and results retain their IDs. In the dashboard, use **Share** to issue credentials for an existing challenge.

Before using the deployment, check that `/boltxmarathon/schema.sql` returns 404 and that the game pages and dashboard load over HTTPS.

## Run a stream

- Sign in to **Control room**. In **Spin Wheel**, add players and wheel units, and use **Make current** to pick an eligible player. Leave a player's limit blank to inherit the default. Enter **0** for unlimited. A spin awards one unit and advances to the next player with room.
- Open the live wheel to drag, flick, tap, or hold **SPIN**. Confirm a proposed result with **Accept & assign**, or choose **Spin again** to keep the player and inventory as they are. Use **View your list** to check off assignments, print to PDF, or download a UTF-8 CSV.
- Use **Share** to issue a private code, a configurable play or view link, and a separate read-only OBS link. Save these credentials when generated. The server keeps their hashes. Rotation or archiving invalidates old links and guest sessions.
- Each game has its own **Game settings**. For Mystery Boxes, choose **Shake & pop** or **Key unlock** and optionally enable scratch paper. The reveal button in the scratch popup is the keyboard-accessible alternative.
- In **Mystery Boxes**, adding a challenge creates a box. You can assign the same challenge to additional boxes, swap box numbers, and shuffle sealed boxes. Use **Open on stream** to animate a reveal or **Mark revealed** for an immediate update. Click any revealed crate to enlarge its paper.
- Use **Wheel display** or **Box display** in OBS. Their URLs end in `?display`; they stay read-only even in a browser with an active operator session. A display receives changes automatically. Game sound, when enabled, requires a gesture in that browser; no ambient track was supplied.
- **Seal all boxes** keeps the challenges. **Reset collections** returns assigned units to the wheel. **Clear all collections** moves assigned units into the removed inventory instead. **Reset wheel and collections** restores both assigned and removed units.

## Artwork

The supplied reference is used for the layout and art direction. The wheel, bolt control, glass cards, scenery, crates and papers are separate SVG, CSS and HTML elements. The original standalone logo and player photos were not provided. `public/assets/boltx-logo.svg` and `public/assets/bolt.svg` are labeled temporary traces; replace them with the approved files when available. Player cards display initials until photos are uploaded.

## Verification

Import `schema.sql` into a separate empty database ending in `_test`, set `BOLTX_DSN` to point there, then run `php migrate-v2.php` and `php test-game.php`. Use a fresh schema for every run.
