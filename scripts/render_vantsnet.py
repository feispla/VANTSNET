import asyncio
import os
from playwright.async_api import async_playwright

HTML_PATH = '/home/z/my-project/scripts/vantsnet_arch.html'
OUT_PATH = '/home/z/my-project/download/VANTSNET/arquitectura-vantsnet.png'


async def html_to_image(html_path, output_path, selector='#root',
                        width=1700, height=None, scale=2):
    """HTML -> PNG per skill template: auto-resize viewport to fit content."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={'width': width, 'height': height or 900},
            device_scale_factor=scale
        )
        await page.goto(f'file://{html_path}', wait_until='networkidle')
        await page.wait_for_timeout(500)

        el = page.locator(selector)
        bbox = await el.bounding_box()
        if bbox:
            fit_w = max(width, int(bbox['width'] + 100))
            fit_h = int(bbox['height'] + 100)
            await page.set_viewport_size({'width': fit_w, 'height': fit_h})
            await page.wait_for_timeout(200)
            print(f'content bbox: {bbox["width"]:.0f} x {bbox["height"]:.0f}')
        await el.screenshot(path=output_path)
        await browser.close()
        print(f'OK {output_path} ({os.path.getsize(output_path)/1024:.0f}KB)')


if __name__ == '__main__':
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    asyncio.run(html_to_image(HTML_PATH, OUT_PATH))
