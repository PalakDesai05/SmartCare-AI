import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, X, Send, Bot, User, Minimize2, Maximize2,
  Sparkles, AlertCircle, Calendar, Pill, Stethoscope, Activity,
  RefreshCw, Upload, FileText, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getAllDoctors, bookAppointment, saveReport,
  type DbDoctor,
} from '../../firebase/firebaseDb';

// ─── TYPES ─────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  intent?: string;
  isTyping?: boolean;
  // optional rich payload
  payload?: MessagePayload;
}

type MessagePayload =
  | { type: 'doctor_list';   doctors: DbDoctor[] }
  | { type: 'upload_ui' }
  | { type: 'date_picker';   dates: Array<{ label: string; value: string }> }
  | { type: 'time_picker';   slots: string[] }
  | { type: 'confirm_booking'; token: number; doctorName: string; date: string; time: string };

// ─── CONVERSATION FLOW STATE ────────────────────────────────
type FlowType = 'booking' | 'upload' | null;

interface ConversationState {
  flow: FlowType;
  step: number;
  data: {
    doctor?: DbDoctor;
    date?: string;
    time?: string;
  };
}

const INITIAL_FLOW: ConversationState = { flow: null, step: 0, data: {} };

// ─── NLP INTENT ENGINE ──────────────────────────────────────
interface Intent {
  id: string;
  patterns: RegExp[];
  response?: string;
  action?: 'start_booking' | 'start_upload' | 'emergency' | 'emergency_demo';
}

const INTENTS: Intent[] = [
  {
    id: 'greeting',
    patterns: [
      /\b(hi|hello|hey|good\s*(morning|afternoon|evening|night)|namaste|howdy)\b/i,
      /^(hi+|hello+|hey+)[\s!.]*$/i,
    ],
    response: "👋 Hello! I'm your **SmartCare AI Assistant**.\n\nI can help you:\n• 📅 **Book appointments** — real doctors, real slots\n• 📄 **Upload reports** — share with your doctor\n• 💊 View prescriptions & pharmacy\n• 🚨 **Emergency response** — instant help\n• 💡 Health & symptom advice\n\nWhat would you like to do today?",
  },
  {
    id: 'book_appointment',
    patterns: [
      /\b(book|want|need|schedule|make|set up|get)\b.{0,30}(appointment|doctor|visit|consult|checkup)\b/i,
      /\b(appointment|consult|visit)\b.{0,20}(book|schedule|want|need|get|make)\b/i,
      /\b(see\s*a\s*doctor|meet\s*a\s*doctor|book\s*a\s*doc)\b/i,
      /^book$/i,
    ],
    action: 'start_booking',
  },
  {
    id: 'symptom_cardiac',
    patterns: [
      /\b(chest\s*pain|heart\s*attack|cardiac|palpitation|chest\s*tight|heart\s*burn|shortness\s*of\s*breath|sob)\b/i,
      /\b(i\s*(have|feel|am\s*having))\b.{0,20}\b(chest|heart|breath)\b/i,
    ],
    action: 'emergency_demo',
  },
  {
    id: 'symptom_general',
    patterns: [
      /\b(fever|temperature|feverish|high\s*fever)\b/i,
    ],
    response: "🌡️ **Fever detected**\n\nImmediate guidance:\n• Monitor temp every 30 min\n• Take paracetamol (500mg)\n• Drink fluids\n• If >103°F or lasting >3 days → **Book emergency appointment**\n\nShall I find an available doctor now?",
  },
  {
    id: 'symptom_cough',
    patterns: [
      /\b(cough|cold|sore\s*throat|sneezing|runny\s*nose|congestion)\b/i,
    ],
    response: "🤧 **Cold / Cough Symptoms**\n\nAdvice:\n• Stay warm and hydrated\n• Steam inhalation helps\n• Honey + ginger tea\n• If lasting >7 days → see a doctor\n\nWant to **book an appointment** with a General Physician?",
  },
  {
    id: 'symptom_head',
    patterns: [
      /\b(headache|migraine|head\s*pain|dizziness|dizzy|vertigo)\b/i,
    ],
    response: "🤕 **Headache / Dizziness**\n\nGuidance:\n• Rest in a quiet, dark room\n• Stay hydrated\n• Avoid screens\n• If severe or sudden → could indicate BP spike\n\nWant me to check your **health metrics** or **book an appointment**?",
  },
  {
    id: 'upload_report',
    patterns: [
      /\b(upload|add|send|share|attach)\b.{0,30}(report|lab|test|result|scan|x-ray|mri|ct|file)\b/i,
      /\b(report|lab result|test result|scan|x-ray|mri|ct|blood test)\b.{0,20}(upload|send|share|add)\b/i,
      /\b(upload report|add report|send report)\b/i,
    ],
    action: 'start_upload',
  },
  {
    id: 'view_reports',
    patterns: [
      /\b(view|see|check|show|my)\b.{0,20}(report|lab|test|result|scan|x-ray|mri|ct|blood test)\b/i,
      /\b(report|lab|test result)\b.{0,20}(view|see|check|show)\b/i,
    ],
    response: "🔬 **Your Reports**\n\nYou can view all uploaded reports in the **Health Metrics** section.\n\n• Go to **Health Metrics** → scroll to \"Upload Reports\"\n• Your doctor can view them during your appointment\n\nWant to **upload a new report** right now?",
  },
  {
    id: 'cancel_appointment',
    patterns: [
      /\b(cancel|reschedule|postpone|move)\b.{0,20}(appointment|visit|booking)\b/i,
    ],
    response: "❌ **Cancel / Reschedule**\n\nTo cancel or reschedule:\n1. Go to **Patient Overview → Recent Appointments**\n2. Select the appointment → click **Cancel** or **Reschedule**\n\n⚠️ Please cancel at least **2 hours** before your slot to avoid a penalty fee.",
  },
  {
    id: 'queue_status',
    patterns: [
      /\b(queue|waiting|wait|token|turn|position)\b/i,
      /\bhow\s*(long|many|much)\b.*(wait|queue)\b/i,
      /\bmy\s*(turn|number|token)\b/i,
      /\bqr\b/i,
    ],
    response: "🎫 **Queue & Token**\n\nCheck your live queue status in the **My Queue** section.\n\n• See your token number and position\n• Estimated wait time updates in real time\n• Go to **QR Token** to download your entry pass",
  },
  {
    id: 'prescriptions',
    patterns: [
      /\b(prescription|medicine|medication|drug|tablet|capsule|dosage|rx)\b/i,
      /\b(pharma|pharmacy|chemist)\b/i,
    ],
    response: "💊 **Prescriptions & Pharmacy**\n\nYour prescriptions are in the **Prescriptions** section:\n\n• View all prescribed medications\n• Grant pharmacy access to process your prescription\n• Track billing: **Pending → Billed → Ready for Pickup**\n• Confirm payment once medicines are ready",
  },
  {
    id: 'emergency',
    patterns: [
      /\b(emergency|urgent|ambulance|sos|dying|collapse|faint|unconscious|heart attack|stroke)\b/i,
      /\bcan'?t\s*(breath|breathe)\b/i,
      /\b(call\s*108|call\s*911)\b/i,
    ],
    action: 'emergency',
    response: "🚨 **EMERGENCY — Call 108 NOW!**\n\n**While waiting for ambulance:**\n• Stay calm, keep patient still\n• Loosen tight clothing\n• Do NOT give food or water\n• Note when symptoms started\n\n⚠️ Click the red **Emergency** button (top-right) to alert medical staff immediately.",
  },
  {
    id: 'symptom_chest',
    patterns: [
      /\bchest\s*(pain|tightness|pressure|discomfort|hurt|ache)\b/i,
      /\b(palpitation|heart\s*flutter|irregular\s*heart)\b/i,
    ],
    response: "⚠️ **Chest Pain — Take Seriously**\n\n**Call 108 immediately if:**\n• Pain radiates to arm/jaw/neck\n• Shortness of breath or sweating\n• Dizziness or nausea\n\n**If mild:**\n• Sit down, rest, avoid exertion\n• Take aspirin (75mg) if not allergic\n\n🫀 I recommend seeing a **Cardiologist**.\nShall I book an appointment now?",
  },
  {
    id: 'symptom_headache',
    patterns: [
      /\b(headache|head\s*ache|migraine|head\s*pain)\b/i,
    ],
    response: "🧠 **Headache / Migraine**\n\n**Immediate relief:**\n• Rest in a quiet, dark room\n• Drink water (dehydration is #1 cause)\n• Paracetamol 500mg if needed\n• Cold pack on forehead\n\n**See a doctor if:**\n• Sudden severe \"thunderclap\" headache\n• Fever + stiff neck + vision changes\n• Recurring > 3× per week\n\n🧠 Recommend: **Neurologist**. Want me to book?",
  },
  {
    id: 'symptom_fever',
    patterns: [
      /\b(fever|high\s*temperature|chills|shivering|pyrexia)\b/i,
    ],
    response: "🌡️ **Fever Guidance**\n\n**Home care (< 102°F):**\n• Rest and drink lots of fluids\n• Paracetamol / Ibuprofen as directed\n• Damp cloth on forehead\n\n**See a doctor if:**\n• Fever > 103°F (39.4°C)\n• Lasts more than 3 days\n• Rash, difficulty breathing, confusion\n\nShall I find you an available doctor?",
  },
  {
    id: 'find_doctor',
    patterns: [
      /\b(find|search|list|show|who|which)\b.{0,20}(doctor|dr\.?|physician|specialist|surgeon)\b/i,
      /\b(available\s*doctor|doctor\s*list)\b/i,
      /\bbest\s*doctor\b/i,
    ],
    action: 'start_booking',
  },
  {
    id: 'cardiologist',
    patterns: [
      /\b(cardiolog|heart\s*doctor|cardiac\s*specialist)\b/i,
    ],
    action: 'start_booking',
    response: "🫀 Looking up available **Cardiologists** for you...",
  },
  {
    id: 'neurologist',
    patterns: [
      /\b(neurolog|brain\s*doctor|nerve\s*specialist)\b/i,
    ],
    action: 'start_booking',
    response: "🧠 Looking up available **Neurologists** for you...",
  },
  {
    id: 'health_metrics',
    patterns: [
      /\b(health\s*metrics|vitals|blood\s*pressure|blood\s*sugar|heart\s*rate|spo2|cholesterol|bmi)\b/i,
      /\bhow\s*(am\s*I|is\s*my)\s*(health|condition|doing)\b/i,
    ],
    response: "📊 **Health Metrics**\n\nView your live vitals in the **Health Metrics** section:\n\n• Blood Pressure, Heart Rate, Blood Sugar\n• SpO₂, Temperature, Cholesterol\n• Updated by your doctor after each visit\n• Upload lab reports for your doctor to review",
  },
  {
    id: 'billing',
    patterns: [
      /\b(bill|payment|pay|cost|fee|charge|invoice|receipt)\b/i,
    ],
    response: "💳 **Billing & Payments**\n\n• View bills in **Prescriptions & Pharmacy**\n• Bills appear after the pharmacy processes your prescription\n• Pay at the pharmacy counter during pickup\n\nFor billing queries, contact reception at **Block A, Ground Floor**.",
  },
  {
    id: 'thanks',
    patterns: [
      /\b(thank|thanks|thank\s*you|thx|ty|great|awesome|perfect|helpful|nice)\b/i,
    ],
    response: "😊 You're welcome! I'm always here to help.\n\nStay healthy! 💚",
  },
  {
    id: 'goodbye',
    patterns: [
      /\b(bye|goodbye|see\s*you|take\s*care|later|exit|quit|close)\b/i,
    ],
    response: "👋 Goodbye! Take care and stay healthy. Come back anytime! 💚",
  },
];

// ─── INTENT CLASSIFIER ──────────────────────────────────────
function classifyIntent(input: string): Intent | null {
  const trimmed = input.trim();
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(trimmed)) return intent;
    }
  }
  return null;
}

// ─── SPECIALIST FILTER ──────────────────────────────────────
function getSpecFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/cardiolog|heart|cardiac/.test(t))   return 'Cardiology';
  if (/neurolog|brain|nerve/.test(t))      return 'Neurology';
  if (/orthop|bone|joint/.test(t))         return 'Orthopedics';
  if (/pediatric|child|kids/.test(t))      return 'Pediatrics';
  if (/dermatol|skin/.test(t))             return 'Dermatology';
  if (/gastro|stomach|digest/.test(t))     return 'Gastroenterology';
  if (/general|gp|physician/.test(t))      return 'General';
  return null;
}

// ─── AI FALLBACK ────────────────────────────────────────────
async function callGrokAPI(userMessage: string, history: Message[]): Promise<string> {
  const recentHistory = history.slice(-6).map(m => ({
    role: m.role === 'bot' ? 'assistant' : 'user',
    content: m.text,
  }));

  try {
    const res = await fetch('http://localhost:8000/chatbot/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        context: `HealthAI medical assistant. Previous: ${JSON.stringify(recentHistory)}`,
      }),
    });
    if (!res.ok) throw new Error('Backend unavailable');
    const data = await res.json();
    return data.reply || "I couldn't get a response. Please try again.";
  } catch {
    return "🤔 I couldn't find a specific answer for that. Try asking about:\n• Booking an appointment\n• Uploading a report\n• Symptoms or medicines\n\n💡 Enable AI Mode (✨) for smarter answers.";
  }
}

// ─── TOKEN GENERATOR ────────────────────────────────────────
function generateToken() {
  return Math.floor(Math.random() * 90) + 10;
}

// ─── QUICK REPLIES ──────────────────────────────────────────
const QUICK_REPLIES = [
  { label: '📅 Book Appointment',  text: 'book appointment'        },
  { label: '📄 Upload Report',     text: 'upload report'           },
  { label: '💊 Prescriptions',    text: 'show my prescriptions'   },
  { label: '🎫 My Queue',         text: 'what is my queue status' },
  { label: '🚨 Emergency Demo',   text: 'i have chest pain'       },
  { label: '📊 Health Metrics',   text: 'show my health metrics'  },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function Chatbot({ onEmergencyDemo }: { onEmergencyDemo?: () => void }) {
  const { user } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([{
    id: '0', role: 'bot', timestamp: new Date(),
    text: "👋 Hi! I'm your **SmartCare AI Assistant**.\n\nI can book appointments, handle emergencies, upload reports, and more. Try: \"I have chest pain\"!",
    intent: 'greeting',
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [useAI,   setUseAI]   = useState(false);
  const [flow,    setFlow]    = useState<ConversationState>(INITIAL_FLOW);
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);

  // Load doctors on mount
  useEffect(() => {
    getAllDoctors().then(setDoctors).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, minimized]);

  // ── Helpers ──────────────────────────────────────────────
  const pushBot = (text: string, intent?: string, payload?: MessagePayload) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'bot', text,
      timestamp: new Date(), intent, payload,
    }]);
  };

  const pushTyping = () => {
    const id = `${Date.now()}_typing`;
    setMessages(prev => [...prev, { id, role: 'bot', text: '', timestamp: new Date(), isTyping: true }]);
    return id;
  };

  const removeTyping = (id: string) =>
    setMessages(prev => prev.filter(m => m.id !== id));

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ── Booking flow steps ───────────────────────────────────
  const startBookingFlow = async (specialistFilter?: string | null) => {
    const tid = pushTyping();
    await delay(700);
    removeTyping(tid);

    const filtered = specialistFilter
      ? doctors.filter(d => d.specialization?.toLowerCase().includes(specialistFilter.toLowerCase()))
      : doctors;

    const available = filtered.filter(d => d.available !== false);
    const list = available.length > 0 ? available : doctors.slice(0, 6);

    if (list.length === 0) {
      pushBot("😔 No doctors are available right now. Please check back later or visit the **Find Doctors** page.", 'book_appointment');
      return;
    }

    pushBot(
      `🩺 **Available Doctors**${specialistFilter ? ` (${specialistFilter})` : ''}\n\nSelect a doctor to book:`,
      'book_appointment',
      { type: 'doctor_list', doctors: list }
    );
    setFlow({ flow: 'booking', step: 1, data: {} });
  };

  const handleDoctorSelect = async (doctor: DbDoctor) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user',
      text: `${doctor.name} (${doctor.specialization})`,
      timestamp: new Date(),
    }]);
    const tid = pushTyping();
    await delay(600);
    removeTyping(tid);

    // Build next 5 days as date options
    const today = new Date();
    const dateOptions = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const label = i === 0 ? 'Today'
        : i === 1 ? 'Tomorrow'
        : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const value = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      return { label, value };
    });

    pushBot(
      `✅ **${doctor.name}** (${doctor.specialization})\n\n⭐ ${doctor.rating}/5  •  📍 ${doctor.location || 'Hospital'}  •  💰 ₹${doctor.fee}\n\n📅 **Select a date:**`,
      'book_appointment',
      { type: 'date_picker', dates: dateOptions }
    );
    setFlow({ flow: 'booking', step: 2, data: { doctor } });
  };

  const handleDateSelect = async (dateLabel: string, dateValue: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user',
      text: `📅 ${dateLabel}`,
      timestamp: new Date(),
    }]);
    const tid = pushTyping();
    await delay(500);
    removeTyping(tid);

    const slots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

    pushBot(
      `📅 **${dateLabel}** selected!\n\n⏰ **Choose a time slot:**`,
      'book_appointment',
      { type: 'time_picker', slots }
    );
    setFlow(prev => ({ ...prev, step: 3, data: { ...prev.data, date: dateValue } }));
  };

  const handleTimeSelect = async (timeText: string) => {
    const { doctor, date } = flow.data;
    if (!doctor || !date) { setFlow(INITIAL_FLOW); return; }

    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user',
      text: `⏰ ${timeText}`,
      timestamp: new Date(),
    }]);
    const tid = pushTyping();
    await delay(800);
    removeTyping(tid);

    try {
      const token = generateToken();
      if (user?.firebaseUid) {
        await bookAppointment(user.firebaseUid, {
          patientUid:  user.firebaseUid,
          patientName: user.name || 'Patient',
          doctorUid:   doctor.uid,
          doctorName:  doctor.name,
          date,
          time:        timeText,
          type:        'General Consultation',
          status:      'scheduled',
          tokenNumber: token,
          createdAt:   Date.now(),
        });
      }
      pushBot(
        `✅ **Appointment Booked!**\n\n🩺 Dr: **${doctor.name}**\n📅 Date: **${date}**\n⏰ Time: **${timeText}**\n\n🎫 Token: **#${token}**\n\nCheck **My Queue** for queue status, and **QR Token** for your pass! 🎉`,
        'booking_confirmed',
        { type: 'confirm_booking', token, doctorName: doctor.name, date, time: timeText }
      );
    } catch {
      pushBot("⚠️ Booking failed. Please try again or use **Find Doctors** to book manually.", 'error');
    }
    setFlow(INITIAL_FLOW);
  };

  // ── Upload flow ──────────────────────────────────────────
  const startUploadFlow = async () => {
    const tid = pushTyping();
    await delay(600);
    removeTyping(tid);
    pushBot(
      "📄 **Upload your Report**\n\nSupported: PDF, JPG, PNG (max 10MB)\nAdd an optional note for your doctor.",
      'upload_report',
      { type: 'upload_ui' }
    );
    setFlow({ flow: 'upload', step: 1, data: {} });
  };

  const handleFileUpload = async (file: File, note: string) => {
    if (!user?.firebaseUid) {
      pushBot("⚠️ Please log in to upload reports.", 'error');
      return;
    }
    const tid = pushTyping();
    await delay(800);
    removeTyping(tid);
    try {
      await saveReport(user.firebaseUid, {
        patientUid:  user.firebaseUid,
        patientName: user.name || 'Patient',
        fileName:    file.name,
        fileType:    file.type.startsWith('image') ? 'image' : 'pdf',
        notes:       note.trim() || undefined,
        uploadedAt:  Date.now(),
      });
      pushBot(`✅ **Report uploaded!** "${file.name}"\n\nYour doctor can now view it during your appointment. You can also see it in **Health Metrics → Upload Reports**.`, 'upload_success');
    } catch {
      pushBot("⚠️ Upload failed. Please try uploading from **Health Metrics** page.", 'error');
    }
    setFlow(INITIAL_FLOW);
  };

  // ── Main send handler ────────────────────────────────────
  const handleSend = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput('');
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user',
      text: userText, timestamp: new Date(),
    }]);
    setLoading(true);

    try {
      // ── Active booking flow (step 2/3 now handled by button pickers) ──
      // If user still types freely during booking, fall through to NLP

      // ── NLP intent ──────────────────────────────────────
      const intent = classifyIntent(userText);

      if (intent?.action === 'emergency_demo') {
        const tid = pushTyping();
        await delay(500);
        removeTyping(tid);
        pushBot(
          `🚨 **Emergency Detected!**\n\nSymptom: **${userText}**\n\nLaunching emergency response…`,
          'emergency_demo'
        );
        setTimeout(() => onEmergencyDemo?.(), 800);
        setLoading(false);
        return;
      }

      if (intent?.action === 'start_booking') {
        const spec = getSpecFromText(userText);
        await startBookingFlow(spec);
        setLoading(false);
        return;
      }

      if (intent?.action === 'start_upload') {
        await startUploadFlow();
        setLoading(false);
        return;
      }

      if (intent?.action === 'emergency' || intent?.id === 'emergency') {
        const tid = pushTyping();
        await delay(500);
        removeTyping(tid);
        pushBot(intent.response || "🚨 Call 108 immediately!", 'emergency');
        setLoading(false);
        return;
      }

      if (intent?.response) {
        const tid = pushTyping();
        await delay(600 + Math.random() * 300);
        removeTyping(tid);
        pushBot(intent.response, intent.id);
        setLoading(false);
        return;
      }

      // ── AI fallback ──────────────────────────────────────
      if (useAI) {
        const tid = pushTyping();
        const reply = await callGrokAPI(userText, messages);
        removeTyping(tid);
        pushBot(reply, 'ai_response');
      } else {
        const tid = pushTyping();
        await delay(500);
        removeTyping(tid);
        pushBot(
          "🤔 I didn't quite catch that. Here's what I can help with:\n\n• 📅 **Book appointment** — say \"book appointment\"\n• 📄 **Upload report** — say \"upload report\"\n• 💊 Prescriptions, queue, health metrics\n• 🚨 Emergency guidance\n\n💡 *Enable ✨ AI Mode for smarter answers.*",
          'unknown'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setFlow(INITIAL_FLOW);
    setMessages([{
      id: '0', role: 'bot', timestamp: new Date(),
      text: "Chat cleared! How can I help you? 😊",
    }]);
  };

  // ── Render text with bold (**) ───────────────────────────
  const renderText = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      return part.split('\n').map((line, j, arr) => (
        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
      ));
    });

  const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // ── Inline upload widget ─────────────────────────────────
  function UploadWidget() {
    const [file,    setFile]    = useState<File | null>(null);
    const [note,    setNote]    = useState('');
    const [saving,  setSaving]  = useState(false);
    const [done,    setDone]    = useState(false);
    const ref = useRef<HTMLInputElement>(null);

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null);
    const onSend = async () => {
      if (!file) return;
      setSaving(true);
      await handleFileUpload(file, note);
      setDone(true);
      setSaving(false);
    };

    if (done) return (
      <div className="flex items-center gap-2 text-green-700 text-xs font-semibold mt-2">
        <CheckCircle className="w-4 h-4" /> Uploaded!
      </div>
    );

    return (
      <div className="mt-2 space-y-2">
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={onPick} />
        {!file ? (
          <button
            onClick={() => ref.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-dashed border-teal-300 rounded-xl text-teal-700 text-xs font-medium hover:bg-teal-100 transition-all w-full justify-center"
          >
            <Upload className="w-3.5 h-3.5" /> Choose file (PDF / JPG / PNG)
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span className="text-xs text-teal-800 truncate flex-1">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </div>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Note for doctor (optional)..."
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              onClick={onSend} disabled={saving}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
            >
              {saving
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                : <><Upload className="w-3.5 h-3.5" /> Upload Report</>}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Render doctor card list ──────────────────────────────
  function DoctorList({ docs }: { docs: DbDoctor[] }) {
    return (
      <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
        {docs.slice(0, 8).map(doc => (
          <button
            key={doc.uid}
            onClick={() => handleDoctorSelect(doc)}
            disabled={loading}
            className="w-full text-left px-3 py-2.5 bg-white border border-teal-100 hover:border-teal-400 hover:bg-teal-50 rounded-xl transition-all group disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-900 group-hover:text-teal-700">{doc.name}</p>
                <p className="text-[10px] text-gray-500">{doc.specialization} · ₹{doc.fee} · ⭐ {Number(doc.rating).toFixed(1)}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${doc.available !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {doc.available !== false ? 'Available' : 'Busy'}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ── Bubble with optional rich content ───────────────────
  function BubbleContent({ msg }: { msg: Message }) {
    return (
      <>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          msg.role === 'user'
            ? 'bg-teal-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
        }`}>
          {renderText(msg.text)}

          {/* Doctor list payload */}
          {msg.payload?.type === 'doctor_list' && (
            <DoctorList docs={msg.payload.doctors} />
          )}

          {/* Date picker payload */}
          {msg.payload?.type === 'date_picker' && (
            <div className="mt-3 flex flex-col gap-1.5">
              {msg.payload.dates.map(d => (
                <button
                  key={d.value}
                  onClick={() => handleDateSelect(d.label, d.value)}
                  disabled={loading || flow.step !== 2}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 hover:border-teal-400 rounded-xl text-sm font-semibold text-teal-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  {d.label}
                  <span className="ml-auto text-[10px] text-teal-400">{d.value}</span>
                </button>
              ))}
            </div>
          )}

          {/* Time picker payload */}
          {msg.payload?.type === 'time_picker' && (
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {msg.payload.slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => handleTimeSelect(slot)}
                  disabled={loading || flow.step !== 3}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-teal-50 hover:bg-teal-600 hover:text-white border border-teal-200 hover:border-teal-600 rounded-xl text-xs font-bold text-teal-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ⏰ {slot}
                </button>
              ))}
            </div>
          )}

          {/* Upload UI payload */}
          {msg.payload?.type === 'upload_ui' && <UploadWidget />}

          {/* Booking confirmation payload */}
          {msg.payload?.type === 'confirm_booking' && (
            <div className="mt-2 p-2 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-700">
              🎫 Token <strong>#{msg.payload.token}</strong> — check <strong>My Queue</strong>
            </div>
          )}
        </div>
        <span className={`text-[10px] text-gray-400 px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
          {fmt(msg.timestamp)}
          {msg.intent && msg.intent !== 'ai_response' && msg.role === 'bot' && (
            <span className="ml-1.5 text-teal-400">#{msg.intent}</span>
          )}
          {msg.intent === 'ai_response' && (
            <span className="ml-1.5 text-yellow-500">✨ AI</span>
          )}
        </span>
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl shadow-[0_8px_30px_rgba(13,148,136,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          <div className="absolute right-full mr-3 bg-teal-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
            SmartCare AI Assistant
          </div>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-teal-100 flex flex-col overflow-hidden transition-all duration-300 ${
          minimized ? 'w-72 h-14' : 'w-80 sm:w-96 h-[620px]'
        }`}>

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="relative">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-teal-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">SmartCare AI</p>
              {!minimized && (
                <p className="text-teal-200 text-[10px]">
                  {flow.flow === 'booking' ? '📅 Booking in progress…'
                   : flow.flow === 'upload'  ? '📄 Upload in progress…'
                   : useAI ? '🤖 AI + NLP Mode' : '💬 NLP Mode'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!minimized && (
                <>
                  <button
                    onClick={() => setUseAI(!useAI)}
                    title={useAI ? 'Disable AI' : 'Enable AI Mode'}
                    className={`p-1.5 rounded-lg transition-all ${useAI ? 'bg-yellow-400/30 text-yellow-300' : 'text-white/60 hover:bg-white/10'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={clearChat} title="Clear chat" className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 transition-all">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 transition-all">
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setOpen(false); setMinimized(false); setFlow(INITIAL_FLOW); }} className="p-1.5 rounded-lg text-white/60 hover:bg-white/10 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      msg.role === 'bot' ? 'bg-teal-100' : 'bg-teal-600'
                    }`}>
                      {msg.role === 'bot' ? <Bot className="w-4 h-4 text-teal-600" /> : <User className="w-4 h-4 text-white" />}
                    </div>
                    <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.isTyping ? (
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                          <div className="flex gap-1 items-center h-4">
                            {[0,1,2].map(i => (
                              <div key={i} className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <BubbleContent msg={msg} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies — only on first load */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 border-t border-gray-100 bg-white">
                  <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wide font-medium">Quick Actions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map(qr => (
                      <button
                        key={qr.text}
                        onClick={() => handleSend(qr.text)}
                        disabled={loading}
                        className="text-[11px] px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl border border-teal-200 transition-all font-medium disabled:opacity-50"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Mode Banner */}
              {useAI && (
                <div className="mx-3 mb-1 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                  <p className="text-[11px] text-yellow-700">AI Mode active — unknown queries sent to Grok/Claude</p>
                </div>
              )}

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={
                        flow.flow === 'booking' && (flow.step === 2 || flow.step === 3) ? 'Use buttons above or type…'
                        : 'Ask me anything…'
                      }
                      disabled={loading}
                      className="flex-1 text-sm bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={() => handleSend('emergency')}
                      className="text-red-400 hover:text-red-600 transition-colors"
                      title="Emergency"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                  >
                    {loading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send className="w-4 h-4" />}
                  </button>
                </div>

                {/* Symptom + action pills */}
                <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide pb-0.5">
                  {[
                    { icon: Calendar,    label: 'Book',      text: 'book appointment' },
                    { icon: Upload,      label: 'Upload Rx', text: 'upload report' },
                    { icon: Activity,    label: 'Fever',     text: 'I have a fever' },
                    { icon: Stethoscope, label: 'Chest',     text: 'I have chest pain' },
                    { icon: Pill,        label: 'Meds',      text: 'show my prescriptions' },
                  ].map(({ icon: Icon, label, text }) => (
                    <button
                      key={label}
                      onClick={() => handleSend(text)}
                      disabled={loading}
                      className="flex-shrink-0 flex items-center gap-1 text-[11px] px-2 py-1 bg-white border border-gray-200 hover:border-teal-300 hover:bg-teal-50 text-gray-600 hover:text-teal-700 rounded-lg transition-all font-medium disabled:opacity-50"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input for flow-level uploads if needed */}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
    </>
  );
}
