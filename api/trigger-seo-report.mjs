import { handleSchedule } from '@vercel/schedules';

export const POST = handleSchedule(async (metadata) => {
  const token = (
    process.env.GITHUB_DISPATCH_TOKEN ||
    process.env.ITHUB_DISPATCH_TOKEN ||
    ''
  ).trim();
  if (!token) {
    throw new Error(
      'Falta GITHUB_DISPATCH_TOKEN en las variables de entorno de Vercel.'
    );
  }

  const url =
    'https://api.github.com/repos/sebascoler/politifacil-29n/actions/workflows/seo-geo-daily-report.yml/dispatches';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'politifacil-vercel-schedule',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `GitHub workflow_dispatch error (${response.status}): ${bodyText}`
    );
  }

  console.log('Vercel Schedule disparó SEO & GEO Daily Report:', {
    executionId: metadata.executionId,
    scheduledAt:
      metadata.scheduledAt && typeof metadata.scheduledAt.toISOString === 'function'
        ? metadata.scheduledAt.toISOString()
        : String(metadata.scheduledAt || ''),
  });
});
