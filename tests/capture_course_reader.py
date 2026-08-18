import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("KUAKUA_BASE_URL", "http://127.0.0.1:4173/kuakua-ai/")
ARTIFACTS = Path(__file__).parent / "artifacts"


def enter_course(page):
    page.goto(BASE_URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="学员体验").click()
    page.get_by_role("dialog").wait_for(state="visible")
    page.get_by_role("button", name="收下夸赞，开始今天").click()
    page.get_by_role("button", name="课程", exact=True).click()
    page.locator(".lesson-row").first.click()
    page.get_by_role("dialog").wait_for(state="visible")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    desktop = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = desktop.new_page()
    enter_course(page)
    page.screenshot(path=str(ARTIFACTS / "11-course-reader-lecture.png"), full_page=True)
    page.get_by_role("tab", name="核心书架").click()
    page.screenshot(path=str(ARTIFACTS / "12-course-reader-books.png"), full_page=True)
    page.get_by_role("tab", name="AI 陪练").click()
    page.locator(".ai-workspace textarea").fill("目标客户是独立顾问；最近一次项目用 3 天整理访谈，目前只有会议记录，没有证据矩阵。")
    page.get_by_role("button", name="生成陪练任务").click()
    page.screenshot(path=str(ARTIFACTS / "13-course-reader-ai.png"), full_page=True)
    desktop.close()

    mobile = browser.new_context(viewport={"width": 390, "height": 844})
    mobile_page = mobile.new_page()
    enter_course(mobile_page)
    mobile_page.screenshot(path=str(ARTIFACTS / "14-course-reader-mobile.png"), full_page=True)
    mobile.close()
    browser.close()
