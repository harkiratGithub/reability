import { Request, Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as os from 'os';
dotenv.config();

const sessions: { [key: string]: string } = {};

const getRustDeskCredentials = (): { id: string | null; password: string | null } => {
    const homeDir = os.homedir();
    let configDir = '';
  
    switch (os.platform()) {
      case 'win32': // Windows
        configDir = path.join(process.env.APPDATA || '', 'RustDesk');
        break;
      case 'darwin': // macOS
        configDir = path.join(homeDir, 'Library', 'Application Support', 'rustdesk');
        break;
      case 'linux': // Linux
      console.log("===homedir===",homeDir);
        configDir = path.join(homeDir, 'opt', 'rustdesk');
        break;
      default:
        console.error('Unsupported OS');
        return { id: null, password: null };
    }
  console.log("==configDir==",configDir);
    const idPath = path.join(configDir, 'id_ed25519.pub');
    const passPath = path.join(configDir, 'rustdesk-pass');
  
    try {
      const id = fs.existsSync(idPath) ? fs.readFileSync(idPath, 'utf8').trim() : null;
      const password = fs.existsSync(passPath) ? fs.readFileSync(passPath, 'utf8').trim() : null;
  
      return { id, password };
    } catch (error) {
      console.error('Error reading RustDesk credentials:', error);
      return { id: null, password: null };
    }
  };

// Function to fetch RustDesk ID
const getRustDeskID = (role: string): string | null => {
  try {
    const basePath = process.env.RUSTDESK_KEY_PATH || '/opt/rustdesk';
    const rustdeskConfigPath = path.join(basePath, 'id_ed25519.pub');

    if (fs.existsSync(rustdeskConfigPath)) {
      return fs.readFileSync(rustdeskConfigPath, 'utf8').trim();
    }
    return null;
  } catch (error) {
    console.error(`Error reading RustDesk ID for ${role}:`, error);
    return null;
  }
};

// API to fetch RustDesk ID
export const fetchRustDeskID = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.params.role;
    if (!role || (role !== 'patient' && role !== 'therapist')) {
      res.status(400).json({ error: 'Invalid or missing role' });
      return;
    }
    //const credentials = getRustDeskCredentials();

    
    const rustdeskID = getRustDeskID(role);
    if (rustdeskID) {
        //console.log('RustDesk ID:', credentials.id);
      //console.log('RustDesk Password:', credentials.password);
      res.status(200).json({ rustdeskID });
      
    } else {
      res.status(404).json({ error: `RustDesk ID not found for role: ${role}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Register a client
export const registerClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientType, rustdeskId } = req.body;
    if (!clientType || !rustdeskId) {
      res.status(400).json({ error: 'Missing clientType or rustdeskId' });
      return;
    }

    sessions[clientType] = rustdeskId;
    res.status(200).json({ message: `${clientType} registered successfully`, rustdeskId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register client' });
  }
};

// Fetch registered sessions
export const getRustDeskSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientType } = req.params;
    const otherClientType = clientType === 'patient' ? 'therapist' : 'patient';

    if (!sessions[otherClientType]) {
      res.status(404).json({ error: `${otherClientType} is not registered yet` });
      return;
    }

    res.status(200).json({ rustdeskId: sessions[otherClientType] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch connection' });
  }
};

// Create a RustDesk session
export const createRustDeskSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId, therapistId } = req.body;
    if (!patientId || !therapistId) {
      res.status(400).json({ error: 'Missing patientId or therapistId' });
      return;
    }
    console.log("=========patientId========",patientId);
    console.log("=========therapistId========",therapistId);
    const relayHost = process.env.RUSTDESK_RELAY_HOST || '192.168.2.134';
    const relayPort = process.env.RUSTDESK_RELAY_PORT || '21115';
    const rendezvousPort = process.env.RUSTDESK_RENDEZVOUS_PORT || '21116';

    exec(
      `rustdesk --connect ${therapistId} --relay-host ${relayHost} --relay-port ${relayPort} --rendezvous-host ${relayHost} --rendezvous-port ${rendezvousPort}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error('RustDesk Connection Error:', stderr);
          res.status(500).json({ error: 'Failed to establish connection' });
          return;
        }
        res.status(200).json({ message: 'Connected successfully!' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to establish connection' });
  }
};
