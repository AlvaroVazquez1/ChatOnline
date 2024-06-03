const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const sanitizeHtml = require('sanitize-html');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'node_modules/animate.css')));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

const chatHistory = [];
const users = {};
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33A1', '#33FFF3', '#8D33FF', '#FF8D33'];

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit('previous messages', chatHistory);

    socket.on('new user', (username, callback) => {
        const normalizedUsername = username.trim().toLowerCase();
        const userExists = Object.values(users).some(user => user.username.toLowerCase() === normalizedUsername);

        if (userExists) {
            callback({ success: false, message: 'El nombre de usuario ya está en uso.' });
        } else {
            const userColor = colors[Object.keys(users).length % colors.length];
            users[socket.id] = { username, color: userColor };
            io.emit('user connected', { username, color: userColor });
            callback({ success: true });
        }
    });

    socket.on('chat message', (msg) => {
        const sanitizedMessage = sanitizeHtml(msg.message, {
            allowedTags: [],
            allowedAttributes: {}
        });
        const user = users[socket.id];
        const messageData = { user: user.username, color: user.color, text: sanitizedMessage };
        chatHistory.push(messageData);
        io.emit('chat message', messageData);
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            io.emit('user disconnected', user);
            delete users[socket.id];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
