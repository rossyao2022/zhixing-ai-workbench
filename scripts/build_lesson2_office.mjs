import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const modulesDir = process.env.WORKSPACE_NODE_MODULES || "C:\\Users\\Administrator\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules";
const PptxGenJS = require(path.join(modulesDir, "pptxgenjs"));
const { PDFDocument } = require(path.join(modulesDir, "pdf-lib"));
const sharp = require(path.join(modulesDir, "sharp"));
const JSZip = require(path.join(modulesDir, "jszip"));

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = process.env.LESSON2_OUTPUT_DIR || path.resolve(root, "..", "outputs", "lesson2-feishu-delivery");
const manifestPath = path.join(outputDir, "slide-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const pptxPath = path.join(outputDir, "晴幂科技_第2课_找到客户证据_完整版35页.pptx");
const pdfPath = path.join(outputDir, "晴幂科技_第2课_找到客户证据_完整版35页.pdf");
const contactSheetPath = path.join(outputDir, "晴幂科技_第2课_35页总览.png");

async function normalizePresentationXml(fileName) {
  const zip = await JSZip.loadAsync(fs.readFileSync(fileName));
  const entry = zip.file("ppt/presentation.xml");
  if (!entry) return;
  let xml = await entry.async("string");
  const notesMaster = xml.match(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/);
  if (notesMaster && xml.indexOf("<p:sldIdLst>") < xml.indexOf("<p:notesMasterIdLst>")) {
    xml = xml.replace(notesMaster[0], "");
    xml = xml.replace("</p:sldMasterIdLst>", `</p:sldMasterIdLst>${notesMaster[0]}`);
    zip.file("ppt/presentation.xml", xml);
    fs.writeFileSync(fileName, await zip.generateAsync({ type: "nodebuffer" }));
  }
}

async function buildPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "晴幂科技";
  pptx.company = "晴幂科技";
  pptx.subject = "夸夸学习 AI 第二课完整课件";
  pptx.title = manifest.title;
  pptx.lang = "zh-CN";
  pptx.theme = {
    headFontFace: "Microsoft YaHei",
    bodyFontFace: "Microsoft YaHei",
    lang: "zh-CN",
  };
  for (const entry of manifest.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFEFB" };
    slide.addImage({
      path: entry.image,
      x: 0,
      y: 0,
      w: 13.333333,
      h: 7.5,
      altText: `${entry.number}. ${entry.title}`,
    });
    slide.addNotes(entry.notes || `${entry.title}。`);
  }
  await pptx.writeFile({ fileName: pptxPath });
  await normalizePresentationXml(pptxPath);
}

async function buildPdf() {
  const pdf = await PDFDocument.create();
  pdf.setTitle(manifest.title);
  pdf.setAuthor("晴幂科技");
  pdf.setSubject("夸夸学习 AI 第二课完整课件");
  pdf.setCreator("晴幂科技 · 夸夸学习 AI");
  for (const entry of manifest.slides) {
    const imageBytes = fs.readFileSync(entry.image);
    const image = await pdf.embedPng(imageBytes);
    const page = pdf.addPage([960, 540]);
    page.drawImage(image, { x: 0, y: 0, width: 960, height: 540 });
  }
  fs.writeFileSync(pdfPath, await pdf.save());
}

async function buildContactSheet() {
  const cols = 5;
  const thumbWidth = 320;
  const thumbHeight = 180;
  const gap = 16;
  const rows = Math.ceil(manifest.slides.length / cols);
  const width = cols * thumbWidth + (cols + 1) * gap;
  const height = rows * thumbHeight + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < manifest.slides.length; index += 1) {
    const image = await sharp(manifest.slides[index].image)
      .resize(thumbWidth, thumbHeight, { fit: "fill" })
      .png()
      .toBuffer();
    composites.push({
      input: image,
      left: gap + (index % cols) * (thumbWidth + gap),
      top: gap + Math.floor(index / cols) * (thumbHeight + gap),
    });
  }
  await sharp({
    create: { width, height, channels: 4, background: { r: 236, g: 239, b: 243, alpha: 1 } },
  }).composite(composites).png().toFile(contactSheetPath);
}

await Promise.all([buildPptx(), buildPdf(), buildContactSheet()]);
console.log(JSON.stringify({
  status: "passed",
  slides: manifest.slideCount,
  pptx: pptxPath,
  pdf: pdfPath,
  contactSheet: contactSheetPath,
}, null, 2));
