export type YouTubeOEmbed = {
  title: string;
  authorName: string;
};

export async function fetchYouTubeOEmbed(
  url: string,
): Promise<YouTubeOEmbed | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
    };

    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      return null;
    }

    return {
      title: data.title.trim(),
      authorName:
        typeof data.author_name === 'string' ? data.author_name.trim() : '',
    };
  } catch {
    return null;
  }
}

export async function buildYouTubePromptContext(
  urls: string[],
): Promise<string> {
  if (urls.length === 0) {
    return '';
  }

  const metas = await Promise.all(urls.map((url) => fetchYouTubeOEmbed(url)));
  const lines = ['참고 YouTube 영상 (URL·메타데이터):'];

  urls.forEach((url, index) => {
    lines.push(`- URL: ${url}`);
    const meta = metas[index];
    if (meta?.title) {
      lines.push(`  제목: ${meta.title}`);
    }
    if (meta?.authorName) {
      lines.push(`  채널: ${meta.authorName}`);
    }
  });

  lines.push('제목·URL·사용자 설명을 바탕으로 루틴을 구성하세요.');

  return lines.join('\n');
}
