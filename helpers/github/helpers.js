const { expect } = require('@playwright/test')
const hlpPW = require('../pw/helpers.js')

const GITHUB_API_BASE = 'https://api.github.com/repos'

// These helpers intentionally target the candidate's own temporary GitHub repository.
function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) throw new Error(`Missing required env var: ${name}`)

  return value
}

function getRepoContext() {
  return {
    owner: getRequiredEnv('GITHUB_OWNER'),
    repo: getRequiredEnv('GITHUB_REPO'),
  }
}

function getAuthHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${getRequiredEnv('GITHUB_TOKEN')}`,
    'X-GitHub-Api-Version': '2026-03-10',
  }
}

async function _getIssuePayload(data = {}) {
  const suffix = await hlpPW.getRandomLetters(8)

  return {
    title: data.title || `Playwright issue ${suffix}`,
    body: data.body || `Playwright body ${suffix}`,
  }
}

async function _getIssueCreated(request, data = {}) {
  const { owner, repo } = getRepoContext()
  const payload = await _getIssuePayload(data)
  const response = await request.post(
    `${GITHUB_API_BASE}/${owner}/${repo}/issues`,
    { headers: getAuthHeaders(), data: payload }
  )
  expect(response.status()).toBe(201)
  return response.json()
}

async function _getIssueData(request, issueNumber) {
  const { owner, repo } = getRepoContext()
  const response = await request.get(
    `${GITHUB_API_BASE}/${owner}/${repo}/issues/${issueNumber}`,
    { headers: getAuthHeaders() }
  )
  expect(response.status()).toBe(200)
  return response.json()
}

async function _updateIssue(request, issueNumber, data) {
  const { owner, repo } = getRepoContext()
  const response = await request.patch(
    `${GITHUB_API_BASE}/${owner}/${repo}/issues/${issueNumber}`,
    { headers: getAuthHeaders(), data }
  )
  expect(response.status()).toBe(200)
  return response.json()
}

async function _getIssueComments(request, issueNumber) {
  const { owner, repo } = getRepoContext()
  const response = await request.get(
    `${GITHUB_API_BASE}/${owner}/${repo}/issues/${issueNumber}/comments`,
    { headers: getAuthHeaders() }
  )
  expect(response.status()).toBe(200)
  return response.json()
}

async function _addIssueComment(request, issueNumber, body) {
  const { owner, repo } = getRepoContext()
  const response = await request.post(
    `${GITHUB_API_BASE}/${owner}/${repo}/issues/${issueNumber}/comments`,
    { headers: getAuthHeaders(), data: { body } }
  )
  expect(response.status()).toBe(201)
  return response.json()
}

async function _closeIssue(request, issueNumber) {
  const { owner, repo } = getRepoContext()
  const response = await request.patch(
    `${GITHUB_API_BASE}/${owner}/${repo}/issues/${issueNumber}`,
    { headers: getAuthHeaders(), data: { state: 'closed' } }
  )
  expect(response.status()).toBe(200)
  return response.json()
}

module.exports = {
  getRequiredEnv,
  getRepoContext,
  getAuthHeaders,
  _getIssuePayload,
  _getIssueCreated,
  _getIssueData,
  _updateIssue,
  _getIssueComments,
  _addIssueComment,
  _closeIssue,
}
