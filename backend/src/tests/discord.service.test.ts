import axios from 'axios';
import { sendDiscordWebhook } from '../services/discord.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('sendDiscordWebhook', () => {
  const webhookUrl = 'https://discord.com/api/webhooks/test/token';
  const payload = { content: 'Hello from scheduler!' };

  afterEach(() => jest.clearAllMocks());

  it('should return success on 204 response', async () => {
    mockedAxios.post.mockResolvedValueOnce({ status: 204, data: {} });
    const result = await sendDiscordWebhook(webhookUrl, payload);
    expect(result.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(webhookUrl, payload, expect.any(Object));
  });

  it('should return failure on axios error', async () => {
    const error = {
      isAxiosError: true,
      response: { status: 400, data: { message: 'Bad Request' } },
      message: 'Request failed',
    };
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    mockedAxios.post.mockRejectedValueOnce(error);
    const result = await sendDiscordWebhook(webhookUrl, payload);
    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
  });

  it('should return failure on network error', async () => {
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);
    mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
    const result = await sendDiscordWebhook(webhookUrl, payload);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Network Error');
  });
});
