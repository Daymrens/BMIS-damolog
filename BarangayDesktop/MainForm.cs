using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class MainForm : Form
{
    private readonly LoginResult _user;
    private TabControl tabs = null!;

    public MainForm(LoginResult user)
    {
        _user = user;
        Text = "Barangay Damolog — Management System";
        Size = new Size(1200, 750);
        MinimumSize = new Size(900, 600);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(245, 247, 250);
        BuildUI();
    }

    private void BuildUI()
    {
        // ── Top header ────────────────────────────────────────────────
        var header = new Panel
        {
            Dock = DockStyle.Top,
            Height = 55,
            BackColor = Color.FromArgb(15, 48, 96)
        };

        var logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "logo.png");
        int textOffset = 15;
        if (File.Exists(logoPath))
        {
            var logoBox = new PictureBox
            {
                Image = Image.FromFile(logoPath),
                SizeMode = PictureBoxSizeMode.Zoom,
                Size = new Size(40, 40),
                Location = new Point(12, 8),
                BackColor = Color.Transparent
            };
            header.Controls.Add(logoBox);
            textOffset = 60;
        }

        header.Controls.Add(new Label
        {
            Text = "Barangay Damolog Management System",
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 14, FontStyle.Bold),
            AutoSize = true,
            Location = new Point(textOffset, 8)
        });
        header.Controls.Add(new Label
        {
            Text = "Municipality of Sogod, Cebu",
            ForeColor = Color.FromArgb(180, 210, 255),
            Font = new Font("Segoe UI", 8),
            AutoSize = true,
            Location = new Point(textOffset, 34)
        });

        // User info + logout on the right
        var lblUser = new Label
        {
            Text = $"👤 {_user.FullName}",
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            AutoSize = true,
            Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        var lblRole = new Label
        {
            Text = _user.Role,
            ForeColor = RoleColor(_user.Role),
            Font = new Font("Segoe UI", 8),
            AutoSize = true,
            Anchor = AnchorStyles.Top | AnchorStyles.Right
        };
        var btnLogout = new Button
        {
            Text = "⏻ Logout",
            Size = new Size(88, 28),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(185, 28, 28),
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 8.5f),
            Anchor = AnchorStyles.Top | AnchorStyles.Right,
            Cursor = Cursors.Hand
        };
        btnLogout.FlatAppearance.BorderSize = 0;
        btnLogout.Click += (_, _) =>
        {
            if (MessageBox.Show("Sign out?", "Logout", MessageBoxButtons.YesNo) == DialogResult.Yes)
            {
                Application.Restart();
            }
        };

        header.Controls.AddRange([lblUser, lblRole, btnLogout]);
        header.Resize += (_, _) =>
        {
            btnLogout.Location = new Point(header.Width - 96, 14);
            lblUser.Location   = new Point(header.Width - 96 - 10 - lblUser.PreferredWidth, 10);
            lblRole.Location   = new Point(header.Width - 96 - 10 - lblRole.PreferredWidth, 32);
        };

        // ── Tab control ───────────────────────────────────────────────
        tabs = new TabControl
        {
            Dock = DockStyle.Fill,
            Font = new Font("Segoe UI", 10),
            Padding = new Point(15, 5),
            BackColor = Color.FromArgb(241, 245, 249)
        };

        tabs.TabPages.Add(CreateTab("📊 Dashboard",  new DashboardPanel()));
        tabs.TabPages.Add(CreateTab("👥 Residents",  new ResidentsPanel()));
        tabs.TabPages.Add(CreateTab("🏛 Officials",  new OfficialsPanel()));
        tabs.TabPages.Add(CreateTab("📄 Documents",  new DocumentsPanel()));
        tabs.TabPages.Add(CreateTab("🎫 Queue",      new QueuePanel()));
        tabs.TabPages.Add(CreateTab("💰 Payments",   new PaymentsPanel()));
        tabs.TabPages.Add(CreateTab("📋 Blotter",    new BlotterPanel()));

        Controls.Add(tabs);
        Controls.Add(header);
    }

    private static TabPage CreateTab(string name, Control content)
    {
        var page = new TabPage(name)
        {
            Padding = new Padding(0),
            Margin = new Padding(0),
            BackColor = Color.FromArgb(241, 245, 249),
            UseVisualStyleBackColor = false
        };
        content.Dock = DockStyle.Fill;
        page.Controls.Add(content);
        return page;
    }

    private static Color RoleColor(string role) => role switch
    {
        "Admin"     => Color.FromArgb(147, 197, 253),
        "Secretary" => Color.FromArgb(110, 231, 183),
        "Treasurer" => Color.FromArgb(253, 211, 77),
        _           => Color.FromArgb(209, 213, 219),
    };
}
