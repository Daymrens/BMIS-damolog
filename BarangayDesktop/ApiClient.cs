using System.Net.Http.Json;
using System.Text.Json;

namespace BarangayDesktop;

public static class ApiClient
{
    public static readonly HttpClient Http = new() { BaseAddress = new Uri("http://localhost:5000/") };

    // Current logged-in user (set after login)
    public static LoginResult? CurrentUser { get; set; }

    public static async Task<LoginResult?> LoginAsync(string username, string password)
    {
        var resp = await Http.PostAsJsonAsync("api/auth/login", new { username, password });
        if (!resp.IsSuccessStatusCode) return null;
        var result = await resp.Content.ReadFromJsonAsync<LoginResult>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        CurrentUser = result;
        return result;
    }

    public static async Task<List<T>> GetListAsync<T>(string url)
    {
        var resp = await Http.GetAsync(url);
        if (!resp.IsSuccessStatusCode) return [];
        return await resp.Content.ReadFromJsonAsync<List<T>>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
    }

    public static async Task<T?> GetAsync<T>(string url)
    {
        var resp = await Http.GetAsync(url);
        if (!resp.IsSuccessStatusCode) return default;
        return await resp.Content.ReadFromJsonAsync<T>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    public static async Task<T?> PostAsync<T>(string url, object data)
    {
        var response = await Http.PostAsJsonAsync(url, data);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    public static async Task PostAsync(string url, object data)
    {
        var response = await Http.PostAsJsonAsync(url, data);
        response.EnsureSuccessStatusCode();
    }

    public static async Task<HttpResponseMessage> PostRawAsync(string url, object data) =>
        await Http.PostAsJsonAsync(url, data);

    public static async Task<HttpResponseMessage> PutAsync<T>(string url, T data) =>
        await Http.PutAsJsonAsync(url, data);

    public static async Task<HttpResponseMessage> PatchAsync(string url, object? data = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Patch, url);
        if (data is not null)
            req.Content = JsonContent.Create(data);
        return await Http.SendAsync(req);
    }

    public static async Task DeleteAsync(string url) =>
        await Http.DeleteAsync(url);
}
