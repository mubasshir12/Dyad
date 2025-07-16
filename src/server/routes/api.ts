import express from 'express';
import { getUserSettings, setUserSettings } from '../../main/settings';
import { listApps, getApp, createApp } from '../controllers/apps';
import { getChat, getChats, createChat, deleteChat, deleteMessages } from '../controllers/chats';
import { getAppEnvVars, setAppEnvVars } from '../controllers/env';
import { readAppFile, editAppFile } from '../controllers/files';
import { listVersions, revertVersion, checkoutVersion } from '../controllers/versions';
import { getCurrentBranch } from '../controllers/branches';

const router = express.Router();

// User settings routes
router.get('/user-settings', (req, res) => {
  try {
    const settings = getUserSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/user-settings', (req, res) => {
  try {
    const settings = setUserSettings(req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// App routes
router.get('/apps', async (req, res) => {
  try {
    const apps = await listApps();
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/apps', async (req, res) => {
  try {
    const result = await createApp(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/apps/:id', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const app = await getApp(appId);
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// App environment variables
router.get('/apps/:id/env-vars', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const envVars = await getAppEnvVars({ appId });
    res.json(envVars);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/apps/:id/env-vars', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    await setAppEnvVars({ appId, envVars: req.body.envVars });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// App files
router.get('/apps/:id/files', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const filePath = req.query.filePath as string;
    const content = await readAppFile(appId, filePath);
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/apps/:id/files', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { filePath, content } = req.body;
    const result = await editAppFile(appId, filePath, content);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Chat routes
router.get('/chats', async (req, res) => {
  try {
    const appId = req.query.appId ? parseInt(req.query.appId as string) : undefined;
    const chats = await getChats(appId);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/chats', async (req, res) => {
  try {
    const { appId } = req.body;
    const chatId = await createChat(appId);
    res.json({ chatId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/chats/:id', async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    const chat = await getChat(chatId);
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/chats/:id', async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    await deleteChat(chatId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/chats/:id/messages', async (req, res) => {
  try {
    const chatId = parseInt(req.params.id);
    await deleteMessages(chatId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Version control routes
router.get('/apps/:id/versions', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const versions = await listVersions({ appId });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/apps/:id/versions/revert', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { previousVersionId } = req.body;
    await revertVersion({ appId, previousVersionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/apps/:id/versions/checkout', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const { versionId } = req.body;
    await checkoutVersion({ appId, versionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/apps/:id/branch', async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const branch = await getCurrentBranch(appId);
    res.json(branch);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router; 