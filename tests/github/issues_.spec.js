const { test, expect } = require('../../fixtures/fixtures.js')
const hlpPW = require('../../helpers/pw/helpers.js')
const hlpGitHub = require('../../helpers/github/helpers.js')

test('after creating an issue via UI, it should be visible in the UI', async ({ request, page, ids }) => {
  const { owner, repo } = hlpGitHub.getRepoContext()
  const suffix = await hlpPW.getRandomLetters(8)
  const title = `Playwright issue ${suffix}`

  await test.step('navigate to new issue form', async () => {
    await page.goto(`/${owner}/${repo}/issues/new`)
  })

  await test.step('fill and submit the form', async () => {
    await page.getByRole('textbox', { name: 'Add a title' }).fill(title)
    await page.getByRole('textbox', { name: 'Markdown value' }).fill(`Playwright body ${suffix}`)

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/_graphql') && response.request().method() === 'POST' && response.status() === 200),
      page.getByRole('main').getByRole('button', { name: 'Create' }).click(),
    ])

    await page.waitForURL(/\/issues\/\d+$/)
  })

  const issueNumber = parseInt(page.url().match(/\/issues\/(\d+)/)[1])
  ids.set({ issue_number: issueNumber })

  await test.step('assert via API', async () => {
    const issue = await hlpGitHub._getIssueData(request, issueNumber)
    expect(issue.title).toBe(title)
    expect(issue.state).toBe('open')
  })

  await test.step('cleanup', async () => {
    await hlpGitHub._closeIssue(request, issueNumber)
  })
})

test('after creating an issue via API, edit it and assert via API', async ({ request, page, ids }) => {
  const { owner, repo } = hlpGitHub.getRepoContext()
  const suffix = await hlpPW.getRandomLetters(8)
  const newTitle = `Playwright issue edited ${suffix}`

  const issue = await test.step('create issue via API', async () => {
    const created = await hlpGitHub._getIssueCreated(request)
    ids.set({ issue_number: created.number })
    return created
  })

  await test.step('navigate to issue page', async () => {
    await page.goto(`/${owner}/${repo}/issues/${issue.number}`)
  })

  await test.step('edit title via UI', async () => {
    await page.getByRole('button', { name: 'Edit issue title' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill(newTitle)

    await Promise.all([
      page.waitForResponse(response => response.url().includes('/_graphql') && response.request().method() === 'POST' && response.status() === 200),
      page.getByRole('button', { name: 'Save ( enter )' }).click(),
    ])
  })

  await test.step('assert via API', async () => {
    const updated = await hlpGitHub._getIssueData(request, issue.number)
    expect(updated.title).toBe(newTitle)
  })

  await test.step('cleanup', async () => {
    await hlpGitHub._closeIssue(request, issue.number)
  })
})

test('after creating an issue via API, close it and assert via API', async ({ request, page, ids }) => {
  const { owner, repo } = hlpGitHub.getRepoContext()

  const issue = await test.step('create issue via API', async () => {
    const created = await hlpGitHub._getIssueCreated(request)
    ids.set({ issue_number: created.number })
    return created
  })

  await test.step('navigate to issue page', async () => {
    await page.goto(`/${owner}/${repo}/issues/${issue.number}`)
  })

  await test.step('close issue via UI', async () => {
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/_graphql') && response.request().method() === 'POST' && response.status() === 200),
      page.getByRole('button', { name: 'Close issue' }).click(),
    ])
  })

  await test.step('assert via API', async () => {
    const closed = await hlpGitHub._getIssueData(request, issue.number)
    expect(closed.state).toBe('closed')
  })
})
