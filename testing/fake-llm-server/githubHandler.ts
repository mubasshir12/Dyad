import { Request, Response } from "express";

// Mock data for testing
const mockAccessToken = "fake_access_token_12345";
const mockDeviceCode = "fake_device_code_12345";
const mockUserCode = "FAKE-CODE";
const mockUser = {
  login: "testuser",
  id: 12345,
  email: "testuser@example.com",
};

const mockRepos = [
  {
    id: 1,
    name: "test-repo-1",
    full_name: "testuser/test-repo-1",
    private: false,
    owner: { login: "testuser" },
    default_branch: "main",
  },
  {
    id: 2,
    name: "test-repo-2",
    full_name: "testuser/test-repo-2",
    private: true,
    owner: { login: "testuser" },
    default_branch: "main",
  },
  {
    id: 3,
    name: "existing-app",
    full_name: "testuser/existing-app",
    private: false,
    owner: { login: "testuser" },
    default_branch: "main",
  },
];

const mockBranches = [
  { name: "main", commit: { sha: "abc123" } },
  { name: "develop", commit: { sha: "def456" } },
  { name: "feature/test", commit: { sha: "ghi789" } },
];

// Store device flow state
let deviceFlowState = {
  deviceCode: mockDeviceCode,
  userCode: mockUserCode,
  authorized: false,
  pollCount: 0,
};

// GitHub Device Flow - Step 1: Get device code
export function handleDeviceCode(req: Request, res: Response) {
  console.log("* GitHub Device Code requested");

  // Reset state for new flow
  deviceFlowState = {
    deviceCode: mockDeviceCode,
    userCode: mockUserCode,
    authorized: false,
    pollCount: 0,
  };

  res.json({
    device_code: mockDeviceCode,
    user_code: mockUserCode,
    verification_uri: "https://github.com/login/device",
    verification_uri_complete: `https://github.com/login/device?user_code=${mockUserCode}`,
    expires_in: 900,
    interval: 1, // Short interval for testing
  });
}

// GitHub Device Flow - Step 2: Poll for access token
export function handleAccessToken(req: Request, res: Response) {
  console.log("* GitHub Access Token polling", {
    pollCount: deviceFlowState.pollCount,
  });

  const { device_code } = req.body;

  if (device_code !== mockDeviceCode) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Invalid device code",
    });
  }

  deviceFlowState.pollCount++;

  // Simulate authorization after 3 polls (for testing)
  if (deviceFlowState.pollCount >= 3) {
    deviceFlowState.authorized = true;
    return res.json({
      access_token: mockAccessToken,
      token_type: "bearer",
      scope: "repo,user,workflow",
    });
  }

  // Return pending status
  res.status(400).json({
    error: "authorization_pending",
    error_description: "The authorization request is still pending",
  });
}

// Get authenticated user info
export function handleUser(req: Request, res: Response) {
  console.log("* GitHub User info requested");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes(mockAccessToken)) {
    return res.status(401).json({
      message: "Bad credentials",
    });
  }

  res.json(mockUser);
}

// Get user emails
export function handleUserEmails(req: Request, res: Response) {
  console.log("* GitHub User emails requested");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes(mockAccessToken)) {
    return res.status(401).json({
      message: "Bad credentials",
    });
  }

  res.json([
    {
      email: "testuser@example.com",
      primary: true,
      verified: true,
      visibility: "public",
    },
  ]);
}

// List user repositories
export function handleUserRepos(req: Request, res: Response) {
  console.log("* GitHub User repos requested");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes(mockAccessToken)) {
    return res.status(401).json({
      message: "Bad credentials",
    });
  }

  if (req.method === "GET") {
    // List repos
    res.json(mockRepos);
  } else if (req.method === "POST") {
    // Create repo
    const { name, private: isPrivate } = req.body;
    console.log("* Creating repository:", name);

    // Check if repo already exists
    const existingRepo = mockRepos.find((repo) => repo.name === name);
    if (existingRepo) {
      return res.status(422).json({
        message: "Repository creation failed.",
        errors: [
          {
            resource: "Repository",
            code: "already_exists",
            field: "name",
          },
        ],
      });
    }

    // Create new repo
    const newRepo = {
      id: mockRepos.length + 1,
      name,
      full_name: `${mockUser.login}/${name}`,
      private: !!isPrivate,
      owner: { login: mockUser.login },
      default_branch: "main",
    };

    mockRepos.push(newRepo);
    res.status(201).json(newRepo);
  }
}

// Get repository info
export function handleRepo(req: Request, res: Response) {
  console.log("* GitHub Repo info requested");

  const { owner, repo } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.includes(mockAccessToken)) {
    return res.status(401).json({
      message: "Bad credentials",
    });
  }

  const foundRepo = mockRepos.find((r) => r.full_name === `${owner}/${repo}`);

  if (!foundRepo) {
    return res.status(404).json({
      message: "Not Found",
    });
  }

  res.json(foundRepo);
}

// Get repository branches
export function handleRepoBranches(req: Request, res: Response) {
  console.log("* GitHub Repo branches requested");

  const { owner, repo } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.includes(mockAccessToken)) {
    return res.status(401).json({
      message: "Bad credentials",
    });
  }

  const foundRepo = mockRepos.find((r) => r.full_name === `${owner}/${repo}`);

  if (!foundRepo) {
    return res.status(404).json({
      message: "Not Found",
    });
  }

  res.json(mockBranches);
}

// Create repository for organization (not implemented in mock)
export function handleOrgRepos(req: Request, res: Response) {
  console.log("* GitHub Org repos requested");

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.includes(mockAccessToken)) {
    return res.status(401).json({
      message: "Bad credentials",
    });
  }

  // For simplicity, just redirect to user repos for mock
  handleUserRepos(req, res);
}
