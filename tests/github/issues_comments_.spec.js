const { test, expect } = require('../../fixtures/fixtures.js')
const hlpPW = require('../../helpers/pw/helpers.js')
const hlpGitHub = require('../../helpers/github/helpers.js')

test('after adding a comment via UI, it should be visible via API', async ({ request, page, ids }) => {
  const { owner, repo } = hlpGitHub.getRepoContext()
  const suffix = await hlpPW.getRandomLetters(8)
  const commentBody = `Playwright comment ${suffix}`

  const issue = await test.step('create issue via API', async () => {
    const created = await hlpGitHub._getIssueCreated(request)
    ids.set({ issue_number: created.number })
    return created
  })

  await test.step('navigate to issue page', async () => {
    await page.goto(`https://github.com/${owner}/${repo}/issues/${issue.number}`)
  })

  await test.step('add comment via UI', async () => {
    await page.getByRole('textbox', { name: 'Add a comment' }).fill(commentBody)

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/_graphql') && r.request().method() === 'POST' && r.status() === 200),
      page.getByRole('button', { name: 'Comment' }).click(),
    ])
  })

  await test.step('assert via API', async () => {
    const comments = await hlpGitHub._getIssueComments(request, issue.number)
    expect(comments.some(c => c.body === commentBody)).toBe(true)
  })

  await test.step('cleanup', async () => {
    await hlpGitHub._closeIssue(request, issue.number)
  })
})
