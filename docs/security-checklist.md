# Security Checklist

- Use HTTPS before sharing `/admin` publicly.
- Replace `ADMIN_PASSWORD` before launch and rotate it after demos.
- Use a long random `SESSION_SECRET`, generated outside the repository.
- Keep `.env` out of git.
- Keep `data/*.sqlite` and SQLite journal files out of git.
- Keep Google Form URLs editable only through the admin dashboard.
- Do not add applicant records, phone numbers, birth dates, or payment data to this app.
- Store applicant information only in Google Forms until a separate consented system exists.
- Back up SQLite before editing production content or deploying code.
- Restrict SSH to key-based login and disable password login where possible.
- Expose only SSH, HTTP, and HTTPS through firewall or router rules.
- Keep Raspberry Pi OS, Node.js, and npm dependencies updated.
- Review admin audit logs after demos or password-sharing events.
- Confirm generated demo images are replaced with approved real photos before using real participants publicly.
