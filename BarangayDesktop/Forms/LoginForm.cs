using System.Drawing;
using System.Windows.Forms;

namespace BarangayDesktop;

public class LoginForm : Form
{
    public LoginResult? LoggedInUser { get; private set; }

    private TextBox txtUser = null!, txtPass = null!;
    private Label lblError = null!;
    private Button btnLogin = null!;

    public LoginForm()
    {
        Text = "Barangay Damolog — Login";
        Size = new Size(400, 480);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        BackColor = Color.FromArgb(245, 247, 250);
        BuildUI();
    }

    private void BuildUI()
    {
        // Header band
        var header = new Panel
        {
            Dock = DockStyle.Top,
            Height = 130,
            BackColor = Color.FromArgb(15, 48, 96)
        };

        var logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "logo.png");
        if (File.Exists(logoPath))
        {
            var logo = new PictureBox
            {
                Image = Image.FromFile(logoPath),
                SizeMode = PictureBoxSizeMode.Zoom,
                Size = new Size(60, 60),
                Location = new Point(165, 12),
                BackColor = Color.Transparent
            };
            header.Controls.Add(logo);
        }

        header.Controls.Add(new Label
        {
            Text = "Barangay Damolog",
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 13, FontStyle.Bold),
            AutoSize = true,
            Location = new Point(0, 78),
            Width = 400,
            TextAlign = ContentAlignment.MiddleCenter
        });
        header.Controls.Add(new Label
        {
            Text = "Municipality of Sogod, Cebu",
            ForeColor = Color.FromArgb(160, 200, 255),
            Font = new Font("Segoe UI", 8),
            AutoSize = true,
            Location = new Point(0, 104),
            Width = 400,
            TextAlign = ContentAlignment.MiddleCenter
        });

        // Form body
        var body = new Panel { Dock = DockStyle.Fill, Padding = new Padding(40, 20, 40, 20) };

        body.Controls.Add(MakeLabel("Username", 20));
        txtUser = MakeTextBox(50, false);
        body.Controls.Add(txtUser);

        body.Controls.Add(MakeLabel("Password", 100));
        txtPass = MakeTextBox(130, true);
        body.Controls.Add(txtPass);

        lblError = new Label
        {
            Text = "",
            ForeColor = Color.FromArgb(185, 28, 28),
            Font = new Font("Segoe UI", 8.5f),
            AutoSize = false,
            Size = new Size(300, 20),
            Location = new Point(40, 175),
            TextAlign = ContentAlignment.MiddleLeft
        };
        body.Controls.Add(lblError);

        btnLogin = new Button
        {
            Text = "Sign In",
            Size = new Size(300, 40),
            Location = new Point(40, 200),
            BackColor = Color.FromArgb(26, 86, 219),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            Cursor = Cursors.Hand
        };
        btnLogin.FlatAppearance.BorderSize = 0;
        btnLogin.Click += async (_, _) => await DoLoginAsync();
        body.Controls.Add(btnLogin);

        // Enter key triggers login
        txtPass.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter) await DoLoginAsync(); };
        txtUser.KeyDown += async (_, e) => { if (e.KeyCode == Keys.Enter) txtPass.Focus(); };

        body.Controls.Add(new Label
        {
            Text = "Barangay Management System v1.0",
            ForeColor = Color.Silver,
            Font = new Font("Segoe UI", 7.5f),
            AutoSize = false,
            Size = new Size(300, 20),
            Location = new Point(40, 260),
            TextAlign = ContentAlignment.MiddleCenter
        });

        Controls.Add(body);
        Controls.Add(header);
    }

    private Label MakeLabel(string text, int y) => new()
    {
        Text = text,
        Font = new Font("Segoe UI", 9, FontStyle.Bold),
        ForeColor = Color.FromArgb(55, 65, 81),
        AutoSize = true,
        Location = new Point(40, y)
    };

    private TextBox MakeTextBox(int y, bool password) => new()
    {
        Size = new Size(300, 30),
        Location = new Point(40, y),
        Font = new Font("Segoe UI", 10),
        UseSystemPasswordChar = password,
        BorderStyle = BorderStyle.FixedSingle
    };

    private async Task DoLoginAsync()
    {
        lblError.Text = "";
        btnLogin.Enabled = false;
        btnLogin.Text = "Signing in…";

        try
        {
            var result = await ApiClient.LoginAsync(txtUser.Text.Trim(), txtPass.Text);
            if (result is null)
            {
                lblError.Text = "Invalid username or password.";
                btnLogin.Enabled = true;
                btnLogin.Text = "Sign In";
            }
            else
            {
                LoggedInUser = result;
                // Use Invoke to ensure DialogResult is set on the UI thread
                Invoke(() =>
                {
                    DialogResult = DialogResult.OK;
                    Close();
                });
            }
        }
        catch
        {
            lblError.Text = "Cannot connect to API. Is BarangayAPI running?";
            btnLogin.Enabled = true;
            btnLogin.Text = "Sign In";
        }
    }
}
