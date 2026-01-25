import { test, expect } from '@playwright/test';

test.describe('Support Chat & Responsiveness', () => {
    test('should open chat widget and show messages on desktop', async ({ page }) => {
        // Navigate to a page where the chat widget is likely to be present
        // Assuming the dashboard has it
        await page.goto('/admin/overview');

        // Check if the chat widget button is visible
        const chatButton = page.getByRole('button', { name: /support chat/i });
        await expect(chatButton).toBeVisible();

        // Click to open
        await chatButton.click();

        // Check if the chat panel is visible
        const chatPanel = page.getByText(/Support Chat/i, { exact: false });
        await expect(chatPanel).toBeVisible();

        // Check for empty state or messages
        const emptyState = page.getByText(/Start a conversation/i);
        const messages = page.locator('.chat-message-list');
        await expect(emptyState.or(messages)).toBeVisible();
    });

    test('should be responsive on iPhone 14', async ({ page }) => {
        // Testing mobile version
        await page.goto('/admin/overview');

        // Check sidebar visibility/toggle
        // On mobile, the sidebar should probably be collapsed or accessible via a menu button
        const menuButton = page.getByRole('button', { name: /toggle sidebar/i });
        if (await menuButton.isVisible()) {
            await menuButton.click();
            const sidebar = page.locator('[data-slot="sidebar"]');
            await expect(sidebar).toBeVisible();
        }

        // Check chat widget on mobile
        const chatButton = page.getByRole('button', { name: /support chat/i });
        await expect(chatButton).toBeVisible();

        // Check if viewport meta has viewport-fit=cover
        const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
        expect(viewportMeta).toContain('viewport-fit=cover');
    });
});
