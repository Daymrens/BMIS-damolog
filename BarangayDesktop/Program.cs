namespace BarangayDesktop;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();

        var login = new LoginForm();
        if (login.ShowDialog() != DialogResult.OK || login.LoggedInUser is null)
            return;

        Application.Run(new MainForm(login.LoggedInUser));
    }
}
