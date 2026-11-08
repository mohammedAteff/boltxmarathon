# BOLTX Challenge Games

Personal Spin Wheel and Mystery Boxes challenges, with an operator control room and scoped play and display links.

## Run locally

1. Install PHP 8.2+ with PDO MySQL, OpenSSL, mbstring and GD, Composer, and MySQL or MariaDB.
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

5. Run `php migrate-v2.php`, `php migrate-accounts.php`, and `composer install --no-dev`. Generate a share key with `php -r 'echo bin2hex(random_bytes(32)), PHP_EOL;'` and set it as `BOLTX_SHARE_KEY` in the PHP process. Run `php -S 127.0.0.1:8017 -t public`. Open [the launcher](http://127.0.0.1:8017/), [My Challenges](http://127.0.0.1:8017/my/) or [the control room](http://127.0.0.1:8017/admin/).

For hosted use, configure the web server document root to the project's **public/** directory, run PHP over HTTPS, and set the database variables in the PHP service environment. Keep the schema, setup script, tests and configuration outside the web root. Back up the database; it contains the live state, event history, and re-encoded avatar images.

For Hostinger shared hosting, deploy the repository to `public_html/boltxmarathon`. Keep the included `.htaccess` in that directory. It rewrites the game and dashboard URLs into `public/` and blocks direct requests for the schema, configuration and repository files.

Create a dedicated database and import `schema.sql`, followed by `demo.sql` if you want starter content. If PHP service environment variables are unavailable, create the Git-ignored `config.local.php` on the server next to `config.php` with this structure:

```php
<?php
return [
    'dsn' => 'mysql:host=localhost;dbname=YOUR_DATABASE;charset=utf8mb4',
    'user' => 'YOUR_DATABASE_USER',
    'password' => 'YOUR_DATABASE_PASSWORD',
    'share_key' => 'YOUR_RANDOM_64_HEX_DIGIT_KEY',
    'base_url' => 'https://mohamedateff.com/boltxmarathon',
    // Optional; set when Google and account mail are configured:
    // 'google_client_id' => 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    // 'mail_from' => 'YOUR_VERIFIED_SENDER_ADDRESS',
];
```

From the application directory over SSH, run the following to create the operator. The password is entered without echo and passed via stdin.

```bash
read -rsp 'Operator password: ' boltx_password
printf '%s\n' "$boltx_password" | php setup-admin.php admin
unset boltx_password
```

For an existing install, back up the database, confirm the original operator exists, and run `php migrate-v2.php`, `php migrate-accounts.php`, and `composer install --no-dev --prefer-dist` before serving the upgraded code. Use a database identity with DDL permissions for the migrations. Both migrations can run again safely. Existing wheels, boxes, results, and shared links keep their IDs and validity. Legacy instances become owned by their original operator, or the first active operator when no owner was recorded.

The share key lets owners copy current links and codes on later visits. Keep a secure backup of the same key and set permissions on `config.local.php` so only the hosting account can read it. Legacy links and codes were stored only as hashes: use **Share** to reissue a copyable set if needed. Reissuing invalidates the old credentials.

Before using the deployment, check that `/boltxmarathon/schema.sql`, `/boltxmarathon/config.local.php`, and `/boltxmarathon/vendor/autoload.php` return 404 and that the game pages and dashboards load over HTTPS.

## Configure Google sign-in and account email

1. In Google Cloud, create or select a project and configure **Google Auth Platform → Branding** with the BOLTX app name, support email, home page, privacy policy, and authorized domain `mohamedateff.com`. Verify the domain in Google Search Console if requested.
2. Under **Audience**, choose External if the site is open to the public. Add test users while the app is in testing and publish when ready. Use only basic identity information (openid, email, profile).
3. Under **Clients**, create an OAuth client of type **Web application**. Add `https://mohamedateff.com` under **Authorized JavaScript origins**; origins have no path. Add the exact local origin (such as `http://localhost:8017`) if testing locally. BOLTX uses a JavaScript popup callback on the current page, so no redirect URI or client secret is needed. See [Google’s setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
4. Set `BOLTX_GOOGLE_CLIENT_ID` in the PHP environment (or `google_client_id` in protected configuration). Confirm Composer dependencies are installed and PHP can fetch Google’s verification keys over HTTPS. Try **Continue with Google** with a test Google account. In an existing email account, sign in again and use **Account settings** to link the Google identity explicitly.
5. Configure PHP mail delivery with a verified sender and set `BOLTX_MAIL_FROM` and `BOLTX_BASE_URL` (or `mail_from` and `base_url` in protected configuration). The base URL must include the full HTTPS deployment path. Send verification and reset messages to a test inbox and check their links before opening registration broadly. When mail is configured, new email accounts verify their address before signing in. Without mail configuration, email/password registration and login still work, and password reset email is unavailable.

## Run a stream

- Sign in to **Control room**. In **Spin Wheel**, add players and wheel units, and use **Make current** to pick an eligible player. Leave a player's limit blank to inherit the default. Enter **0** for unlimited. A spin awards one unit and advances to the next player with room.
- Open the live wheel to drag, flick, tap, or hold **SPIN**. Confirm a proposed result with **Accept & assign**, or choose **Spin again** to keep the player and inventory as they are. Use **View your list** to check off assignments, print to PDF, or download a UTF-8 CSV.
- Use **Share** to issue a private code, a configurable play or view link, and a separate read-only OBS link. Rotation, revocation, or archiving invalidates old links and guest sessions.
- Each game has its own **Game settings**. For Mystery Boxes, choose **Shake & pop** or **Key unlock** and optionally enable scratch paper. The reveal button in the scratch popup is the keyboard-accessible alternative.
- In **Mystery Boxes**, adding a challenge creates a box. You can assign the same challenge to additional boxes, swap box numbers, and shuffle sealed boxes. Use **Open on stream** to animate a reveal or **Mark revealed** for an immediate update. Click any revealed crate to enlarge its paper.
- Use **Wheel display** or **Box display** in OBS. Their URLs end in `?display`; they stay read-only even in a browser with an active operator session. A display receives changes automatically. Game sound, when enabled, requires a gesture in that browser; no ambient track was supplied.
- **Seal all boxes** keeps the challenges. **Reset collections** returns assigned units to the wheel. **Clear all collections** moves assigned units into the removed inventory instead. **Reset wheel and collections** restores both assigned and removed units.

## Artwork

The supplied reference is used for the layout and art direction. The wheel, bolt control, glass cards, scenery, crates and papers are separate SVG, CSS and HTML elements. The original standalone logo and player photos were not provided. `public/assets/boltx-logo.svg` and `public/assets/bolt.svg` are labeled temporary traces; replace them with the approved files when available. Player cards display initials until photos are uploaded.

## Verification

Import `schema.sql` into a separate empty database ending in `_test`, set `BOLTX_DSN` to point there, create a test operator named `operator`, then run both migrations and `php test-game.php`. Use a fresh schema for the game suite. Run `php test-identity.php` with Composer dependencies installed for signed Google token fixtures, account linking, session expiry, and password reset.

Start a local server pointing at another disposable database set up the same way, with a share key and mail disabled. Set `BOLTX_TEST_URL` to its local base URL and `BOLTX_TEST_ADMIN_PASSWORD` to the test operator password, then run `node test-accounts.mjs` with Node.js 20 or newer. This checks two separate regular accounts, challenge creation and isolation, play and view grants, revocation, logout, and administrator management. Run a separate Google popup and email delivery smoke test with real provider configuration.
