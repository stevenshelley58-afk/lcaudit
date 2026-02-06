import type { CollectedData, AnalysisResult } from '@/lib/types'

// Model: gpt-4o-mini (text-heavy, no reasoning needed)
// Data in: html (title, meta, headings, links, schema, images.alt), robots, sitemap, serp

export async function analyseSeo(
  data: CollectedData,
): Promise<AnalysisResult> {
  const { html, robots, sitemap, serp } = data

  // TODO: Replace with real AI call — see .claude/skills/api-providers/SKILL.md
  // Will send structured text data to OpenAI gpt-4o-mini
  const titleLength = html.title?.length ?? 0
  const metaLength = html.metaDescription?.length ?? 0
  const missingAltCount = html.images.filter((img) => !img.alt).length

  const result: AnalysisResult = {
    sectionTitle: 'SEO & Keywords',
    eli5Summary:
      'Search engines can find your site but you\'re missing some basics that help them understand what it\'s about. Your page title and description need work.',
    whyItMatters:
      'Good SEO means more people find your website through Google without paying for ads. Missing basics means lost organic traffic.',
    overallRating: 'Needs Work',
    findings: [
      {
        id: 'seo-001',
        title: titleLength === 0
          ? 'Page title is missing'
          : titleLength > 60
            ? 'Page title is too long'
            : titleLength < 30
              ? 'Page title is too short'
              : 'Page title length is acceptable',
        description:
          titleLength === 0
            ? 'The page has no <title> tag. This is the most important on-page SEO element.'
            : `The page title is ${titleLength} characters. Google typically displays 50-60 characters.`,
        evidence: html.title
          ? `<title>${html.title}</title> (${titleLength} characters)`
          : 'No <title> tag found',
        evidenceType: html.title ? 'HTML' : 'MISSING',
        evidenceDetail: html.title ? 'head > title' : 'head > title expected',
        impact: 'High',
        fix: 'Write a descriptive, keyword-rich title between 50-60 characters that accurately describes the page content.',
        category: 'Meta Tags',
        section: 'SEO & Keywords',
      },
      {
        id: 'seo-002',
        title: metaLength === 0
          ? 'Meta description is missing'
          : metaLength > 160
            ? 'Meta description is too long'
            : 'Meta description present',
        description:
          metaLength === 0
            ? 'No meta description was found. Google will auto-generate one from page content, which may not be ideal.'
            : `Meta description is ${metaLength} characters. Google typically displays 120-160 characters.`,
        evidence: html.metaDescription
          ? `"${html.metaDescription}" (${metaLength} characters)`
          : 'No meta description tag found',
        evidenceType: html.metaDescription ? 'HTML' : 'MISSING',
        evidenceDetail: html.metaDescription
          ? 'head > meta[name="description"]'
          : 'head > meta[name="description"] expected',
        impact: 'Medium',
        fix: 'Write a compelling meta description between 120-160 characters that summarises the page and includes target keywords.',
        category: 'Meta Tags',
        section: 'SEO & Keywords',
      },
      {
        id: 'seo-003',
        title: html.headings.h1.length === 0
          ? 'No H1 heading found'
          : html.headings.h1.length > 1
            ? 'Multiple H1 headings detected'
            : 'H1 heading is present',
        description:
          html.headings.h1.length === 0
            ? 'Every page should have exactly one H1 heading that describes the main topic.'
            : html.headings.h1.length > 1
              ? `Found ${html.headings.h1.length} H1 headings. Best practice is to have exactly one.`
              : `H1 heading found: "${html.headings.h1[0]}".`,
        evidence: html.headings.h1.length > 0
          ? html.headings.h1.map((h) => `<h1>${h}</h1>`).join(', ')
          : 'No <h1> tag found on the page',
        evidenceType: html.headings.h1.length > 0 ? 'HTML' : 'MISSING',
        evidenceDetail: html.headings.h1.length > 0 ? 'h1' : 'h1 expected',
        impact: 'High',
        fix: 'Ensure the page has exactly one H1 heading that clearly describes the main topic and includes the primary keyword.',
        category: 'Headings',
        section: 'SEO & Keywords',
      },
      {
        id: 'seo-004',
        title: missingAltCount > 0
          ? `${missingAltCount} images missing alt text`
          : 'All images have alt text',
        description:
          missingAltCount > 0
            ? `${missingAltCount} out of ${html.images.length} images are missing alt attributes. This hurts accessibility and image SEO.`
            : 'All images have alt attributes, which is great for accessibility and SEO.',
        evidence: missingAltCount > 0
          ? `${missingAltCount} images without alt attribute (e.g. ${html.images.find((img) => !img.alt)?.src ?? 'unknown'})`
          : `All ${html.images.length} images have alt text`,
        evidenceType: missingAltCount > 0 ? 'HTML' : 'HTML',
        evidenceDetail: 'img[alt]',
        impact: missingAltCount > 0 ? 'Medium' : 'Low',
        fix: missingAltCount > 0
          ? 'Add descriptive alt text to all images. Alt text should describe what the image shows, not just be a keyword.'
          : 'No action needed — keep maintaining alt text on new images.',
        category: 'Images',
        section: 'SEO & Keywords',
      },
      {
        id: 'seo-005',
        title: !sitemap?.exists
          ? 'XML sitemap not found'
          : `XML sitemap found with ${sitemap.urlCount} URLs`,
        description:
          !sitemap?.exists
            ? 'No XML sitemap was found at /sitemap.xml. A sitemap helps search engines discover and index all pages.'
            : `Sitemap contains ${sitemap.urlCount} URLs, helping search engines discover your content.`,
        evidence: sitemap?.exists
          ? `Sitemap found with ${sitemap.urlCount} URLs`
          : 'No sitemap.xml found at the expected location',
        evidenceType: sitemap?.exists ? 'METRIC' : 'MISSING',
        evidenceDetail: sitemap?.exists
          ? 'sitemap URL count'
          : '/sitemap.xml expected',
        impact: sitemap?.exists ? 'Low' : 'Medium',
        fix: sitemap?.exists
          ? 'Ensure the sitemap stays up to date and is referenced in robots.txt.'
          : 'Create an XML sitemap listing all important pages and submit it to Google Search Console.',
        category: 'Crawlability',
        section: 'SEO & Keywords',
      },
    ],
  }

  return result
}
