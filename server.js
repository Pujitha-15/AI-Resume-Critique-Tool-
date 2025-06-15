console.log('Starting server.js...');
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const cors = require('cors');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to extract text from PDF or TXT
async function extractText(file) {
  console.log('File details:', {
    mimetype: file.mimetype,
    originalname: file.originalname,
    path: file.path
  });

  if (file.mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(file.path);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (file.mimetype === 'text/plain') {
    return fs.readFileSync(file.path, 'utf8');
  } else if (file.mimetype === 'application/octet-stream') {
    // Handle potential PDF files that might be misidentified
    const dataBuffer = fs.readFileSync(file.path);
    try {
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (err) {
      // If PDF parsing fails, try reading as text
      return fs.readFileSync(file.path, 'utf8');
    }
  }
  throw new Error(`Unsupported file type: ${file.mimetype}. Please upload a PDF or TXT file.`);
}

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  console.log('Received request to /api/analyze');
  try {
    const jobdesc = req.body.jobdesc;
    const file = req.file;
    
    console.log('Request details:', {
      hasFile: !!file,
      fileType: file?.mimetype,
      fileName: file?.originalname,
      hasJobDesc: !!jobdesc
    });

    if (!file || !jobdesc) {
      console.log('Missing file or job description');
      return res.status(400).json({ error: 'Missing resume or job description.' });
    }

    console.log('Starting text extraction...');
    const resumeText = await extractText(file);
    console.log('Text extraction completed, length:', resumeText.length);

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    console.log('Calling OpenAI API...');
    // Call OpenAI for critique
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume reviewer. Provide specific, actionable suggestions to improve resumes for specific job descriptions.'
        },
        {
          role: 'user',
          content: `Resume:\n${resumeText}\n\nJob Description:\n${jobdesc}\n\nPlease provide specific suggestions to improve this resume for this job.`
        }
      ],
      max_tokens: 400,
      temperature: 0.6,
    });
    console.log('OpenAI API call completed');

    res.json({ suggestions: completion.choices[0].message.content.trim() });
  } catch (err) {
    // Improved error logging
    console.error('Error in /api/analyze:', err);
    console.error('Error stack:', err.stack);
    if (err.response && err.response.data) {
      console.error('OpenAI API error details:', err.response.data);
    }
    res.status(500).json({ 
      error: 'Failed to analyze resume.', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    console.log('Resume analysis attempt completed.');
  }
});

// Only ONE app.listen at the end!
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



