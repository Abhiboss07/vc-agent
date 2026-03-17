/**
 * LiveKit Server SDK wrapper.
 *
 * Provides pre-configured clients for:
 *   - Room management (create rooms)
 *   - Agent dispatching (dispatch AI agent into room)
 *   - SIP (create outbound SIP participants for phone calls)
 */
import { RoomServiceClient, SipClient, AgentDispatchClient } from 'livekit-server-sdk';

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://ai-calling-agent-y3p1e3sx.livekit.cloud';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

// Convert wss:// to https:// for the REST API calls
const httpUrl = LIVEKIT_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');

let _roomService = null;
let _sipClient = null;
let _dispatchClient = null;

export function getRoomService() {
  if (!_roomService) {
    _roomService = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return _roomService;
}

export function getSipClient() {
  if (!_sipClient) {
    _sipClient = new SipClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return _sipClient;
}

export function getDispatchClient() {
  if (!_dispatchClient) {
    _dispatchClient = new AgentDispatchClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return _dispatchClient;
}

/**
 * The trunk ID for outbound SIP calls.
 * Override via env var OUTBOUND_TRUNK_ID.
 */
export const OUTBOUND_TRUNK_ID = process.env.OUTBOUND_TRUNK_ID || 'REDACTED_TRUNK_ID';

/**
 * Create a LiveKit room, dispatch an agent, and create an outbound SIP participant.
 *
 * Returns: { call_id, room_name, status, sip_call_id, participant_id }
 */
export async function dispatchCall({ phoneNumber, agentName = 'my-agent', instructions, metadata }) {
  const room = `call-${phoneNumber.replace(/\+/g, '').replace(/\s/g, '')}`;

  const roomService = getRoomService();
  const dispatchClient = getDispatchClient();
  const sipClient = getSipClient();

  // 1. Ensure the room exists
  try {
    await roomService.createRoom({ name: room, emptyTimeout: 300, maxParticipants: 4 });
  } catch (e) {
    if (!e.message?.includes('already exists')) {
      console.warn('Room create warning:', e.message);
    }
  }

  // 2. Dispatch the agent into the room
  try {
    const dispatchOptions = {};
    const metaStr = JSON.stringify({
      instructions: instructions || '',
      ...metadata,
    });
    dispatchOptions.metadata = metaStr;

    await dispatchClient.createDispatch(room, agentName, dispatchOptions);
  } catch (e) {
    console.error('Agent dispatch failed:', e.message);
    // Don't throw here. We may just want the phone UI connected.
  }

  // 3. Create outbound SIP participant (places the actual phone call)
  const sipParticipant = await sipClient.createSipParticipant(
    OUTBOUND_TRUNK_ID,
    phoneNumber,
    room,
    {
      participantName: 'Phone User',
      participantIdentity: `sip-${Date.now()}`,
    }
  );

  return {
    call_id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    room_name: room,
    status: 'dispatched',
    sip_call_id: sipParticipant.sipCallId || sipParticipant.participantId || null,
    participant_id: sipParticipant.participantId || null,
  };
}
