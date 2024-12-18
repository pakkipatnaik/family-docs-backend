// Backend: Node.js (Express)
// Save this file as 'server.js'

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 5000;

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/familyDocs', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err));

// Document Schema and Model
const DocumentSchema = new mongoose.Schema({
    documentName: String,
    uploaderName: String,
    filePath: String,
    fileType: String,
    uploadDate: { type: Date, default: Date.now },
});

const ProfileSchema = new mongoose.Schema({
    familyName: String,
    profilePicture: String, // File path of the uploaded image
});

const Profile = mongoose.model('Profile', ProfileSchema);


const Document = mongoose.model('Document', DocumentSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });

// Routes

// Health check route
app.get('/', (req, res) => {
    res.send('Family Document Management Backend is running');
});

// Upload document
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { documentName, uploaderName } = req.body;
        const fileType = req.file.mimetype;
        const filePath = req.file.path;

        const document = new Document({
            documentName,
            uploaderName,
            filePath,
            fileType,
        });

        await document.save();
        res.status(200).json({ message: 'Document uploaded successfully!' });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Error uploading document', error });
    }
});

// Fetch all documents
app.get('/documents', async (req, res) => {
    try {
        const documents = await Document.find();
        res.status(200).json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'Error fetching documents', error });
    }
});

// Serve individual document files
app.get('/documents/:id', async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        res.sendFile(path.resolve(document.filePath));
    } catch (error) {
        console.error('Error fetching document file:', error);
        res.status(500).json({ message: 'Error fetching document file', error });
    }
});

// Edit a document's metadata
app.put('/documents/:id', async (req, res) => {
    try {
        const { documentName, uploaderName } = req.body;

        // Find and update the document
        const document = await Document.findByIdAndUpdate(
            req.params.id,
            { documentName, uploaderName },
            { new: true, runValidators: true } // Return the updated document
        );

        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }

        res.status(200).json({
            message: 'Document updated successfully',
            document,
        });
    } catch (error) {
        console.error('Error editing document:', error);
        res.status(500).json({ message: 'Error editing document', error });
    }
});

// Delete a document
app.delete('/documents/:id', async (req, res) => {
    try {
        const document = await Document.findByIdAndDelete(req.params.id);
        if (!document) {
            return res.status(404).json({ message: 'Document not found' });
        }
        // Optionally delete the file from the file system
        fs.unlinkSync(path.resolve(document.filePath));
        res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ message: 'Error deleting document', error });
    }
});
app.get('/profile', async (req, res) => {
    const profile = await Profile.findOne();
    res.json(profile || { familyName: '', profilePicture: '' });
});

app.post('/profile', upload.single('profilePicture'), async (req, res) => {
    const { familyName } = req.body;
    const profilePicture = req.file ? req.file.filename : null;

    let profile = await Profile.findOne();
    if (profile) {
        profile.familyName = familyName;
        if (profilePicture) profile.profilePicture = profilePicture;
        await profile.save();
    } else {
        profile = new Profile({ familyName, profilePicture });
        await profile.save();
    }

    res.json({ message: 'Profile updated successfully!', profile });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
