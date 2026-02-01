import fs from 'fs/promises';

async function getLatestInfo() {
    const data = await (
        await fetch(process.env.API_URL, {
            headers: {
                "user-agent": `Mozilla/5.0 Fetch/0.0 NodeJS/${process.version} (https://github.com/wavedevgit/discord-testflight-tracker)`,
                Authorization: process.env.KEY,
                Accept: 'application/json',
            },
        })
    ).json();
    return {
        ...data,
        buildVersion: data.buildVersionId,
        buildVersionId: data.buildVersion,
        releasedAt: (Date.parse(data.releaseDate) / 1000) | 0,
        expiresAt: (Date.parse(data.expireDate) / 1000) | 0,
    };
}

async function sendBuildWebhook({
    webhookUrl,
    buildVersion,
    buildVersionId,
    whatsNew,
    releasedAt, // unix timestamp (seconds)
    expiresAt, // unix timestamp (seconds)
    size,
}) {
    const payload = {
        content: null,
        embeds: [
            {
                title: `New build released - ${buildVersion} (${buildVersionId})`,
                description: whatsNew,
                color: 5793266,
                fields: [
                    {
                        name: 'Released',
                        value: `<t:${releasedAt}:F>`,
                        inline: true,
                    },
                    {
                        name: 'Expires',
                        value: `<t:${expiresAt}:F>`,
                        inline: true,
                    },
                    {
                        name: 'Size',
                        value: String(size),
                        inline: true,
                    },
                ],
                author: {
                    name: 'Discord - Talk, Play, Hang Out',
                },
                footer: {
                    text: 'com.hammerandchisel.discord',
                },
                thumbnail: {
                    url: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/4d/37/9e/4d379ea2-3d04-baa0-f6b6-38ae361d974c/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/1920x1080bb-80.png',
                },
            },
        ],
        attachments: [],
    };

    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Webhook failed (${res.status}): ${text}`);
    }

    return true;
}

async function main() {
    try {
        const data = await getLatestInfo();
        let oldInfo = await (async () => {
            try {
                return await fs.readFile('info.json', 'utf-8');
            } catch {
                return { buildVersionId: '' };
            }
        })();
        if (data.buildVersionId === oldInfo.buildVersionId) return;
        // send new updates
        await sendBuildWebhook({ webhookUrl: process.env.WEBHOOK, ...data, size: `${(data.size / (1024 * 1024)).toFixed(2)} MB`  });
        await fs.writeFile('./info.json', JSON.stringify(data), 'utf-8');
    } catch {}
}
