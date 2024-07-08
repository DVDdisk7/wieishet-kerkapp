// js/app.js
const applicationId = "app.donkeymobile.pknoudalblas";

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    let selectedPerson = null;
    let currentPage = '';

    function loadPage(page) {
        // If there is no token in local storage, navigate to login page
        if (!localStorage.getItem('token')) {
            page = 'login';
        }
        fetch(`/views/${page}.html`)
            .then(response => response.text())
            .then(html => {
                app.innerHTML = html;
                currentPage = page;
                if (page === 'login') initLogin();
                if (page === 'start') initStart();
                if (page === 'select') initSelect();
                if (page === 'game') initGame();
            });
    }

    function navigate(page) {
        loadPage(page);
    }

    function initLogin() {
        // Handle login form submission
        document.getElementById('login-form').addEventListener('submit', function (e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Make API call to donkeymobile to log in
            fetch('https://donkeymobile.com/api/v1/session/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'donkey-app-info': JSON.stringify({ "build": 0, "platform": "WEB_APP", "applicationId": applicationId })
                },
                body: JSON.stringify({ "applicationId": applicationId, "emailAddress": email, "password": password })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.accessToken) {
                        // save token and user data
                        localStorage.setItem('token', data.accessToken);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        navigate('start');
                    } else {
                        alert('Inloggen mislukt');
                    }
                });
        });
    }

    function initStart() {
        // Get user data
        const user = JSON.parse(localStorage.getItem('user'));

        // Display user profile picture and name
        document.getElementById('profilePicture').src = "https://cdn.donkeymobile.com/" + user.image.key;
        document.getElementById('profileName').innerText = "Welkom, \n" + user.firstName + " " + user.lastName + "!";

        // Log out
        document.getElementById('logout').addEventListener('click', () => {
            localStorage.clear();
            navigate('login');
        });

        // Start game
        document.getElementById('start-game').addEventListener('click', () => navigate('select'));
    }

    function initSelect() {
        // Check if a game is already in progress
        if (localStorage.getItem('selectedPerson')) {
            if (confirm('Er is nog een spel bezig, wil je een nieuw spel starten? \n Klik op OK om een nieuw spel te starten of op Annuleren om verder te gaan met het huidige spel.')) {
                localStorage.removeItem('selectedPerson');
                localStorage.removeItem('smoelenboek');
            } else {
                navigate('game');
                return;
            }
        }

        closeGameButton();

        // Get smoelenboek data
        const accessToken = localStorage.getItem('token');
        let smoelenboek = [];

        fetch('https://donkeymobile.com/api/v2/users?isApproved=true', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'donkey-app-info': JSON.stringify({ "build": 0, "platform": "WEB_APP", "applicationId": applicationId })
            }
        })
            .then(response => response.json())
            .then(data => {
                // save firstname, lastname and image key in smoelenboek array
                data.forEach(person => {
                    if (!person.image) return;
                    const personData = {
                        "firstName": person.firstName,
                        "lastName": person.lastName,
                        "imageKey": person.image.thumbnailKey,
                        "crossedOff": false
                    };
                    smoelenboek.push(personData);
                });

                // Sort smoelenboek by lastname
                smoelenboek.sort((a, b) => a.lastName.localeCompare(b.lastName));

                // Display smoelenboek
                const selectionBoard = document.getElementById('selection-board');
                selectionBoard.innerHTML = '';
                smoelenboek.forEach((person, index) => {
                    const card = document.createElement('div');
                    card.className = 'person-card';
                    card.innerHTML = `<img draggable="false" src="https://cdn.donkeymobile.com/${person.imageKey}" alt="${person.firstName} ${person.lastName}"><p>${person.firstName} ${person.lastName}</p>`;
                    card.addEventListener('click', () => selectPerson(index, card));
                    selectionBoard.appendChild(card);
                });

                // save smoelenboek in local storage
                localStorage.setItem('smoelenboek', JSON.stringify(smoelenboek));
            })
            .catch(error => {
                console.error('Error:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('login');
            });

        document.getElementById('confirm-selection').addEventListener('click', () => {
            if (selectedPerson !== null) {
                // save selected person
                localStorage.setItem('selectedPerson', JSON.stringify(smoelenboek[selectedPerson]));
                navigate('game');
            } else {
                alert('Kies een speler om verder te gaan.');
            }
        });
    }

    function selectPerson(index, card) {
        if (selectedPerson !== null) {
            document.querySelector('.person-card.selected').classList.remove('selected');
        }
        selectedPerson = index;
        card.classList.add('selected');
    }

    function initGame() {
        closeGameButton();
        
        // Get game data
        const user = JSON.parse(localStorage.getItem('user'));
        const smoelenboek = JSON.parse(localStorage.getItem('smoelenboek'));
        const selectedPerson = JSON.parse(localStorage.getItem('selectedPerson'));

        // Set details
        document.getElementById('selected-person-name').innerText = `${selectedPerson.firstName} ${selectedPerson.lastName}`;
        document.getElementById('selected-person-image').src = `https://cdn.donkeymobile.com/${selectedPerson.imageKey}`;

        // Display game board
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        smoelenboek.forEach((person, index) => {
            if (index === selectedPerson) return;
            const card = document.createElement('div');
            card.className = 'person-card';
            card.innerHTML = `<img draggable="false" src="https://cdn.donkeymobile.com/${person.imageKey}" alt="${person.firstName} ${person.lastName}"><p>${person.firstName} ${person.lastName}</p>`;
            card.addEventListener('click', () => crossOff(index, card));
            if (person.crossedOff) card.classList.add('crossed-off');
            gameBoard.appendChild(card);
        });
    }

    function crossOff(index, card) {
        // Cross off the selected person or undo the cross off
        if (card.classList.contains('crossed-off')) {
            card.classList.remove('crossed-off');
            const smoelenboek = JSON.parse(localStorage.getItem('smoelenboek'));
            smoelenboek[index].crossedOff = false;
            localStorage.setItem('smoelenboek', JSON.stringify(smoelenboek));
        } else {
            card.classList.add('crossed-off');
            const smoelenboek = JSON.parse(localStorage.getItem('smoelenboek'));
            smoelenboek[index].crossedOff = true;
            localStorage.setItem('smoelenboek', JSON.stringify(smoelenboek));
        }
    }

    function closeGameButton() {
        // Add event listener to close game button
        document.getElementById('closeGame').addEventListener('click', () => {
            if (confirm('Weet je zeker dat je het spel wilt afsluiten?')) {
                localStorage.removeItem('selectedPerson');
                localStorage.removeItem('smoelenboek');
                selectedPerson = null;
                navigate('start');
            }
        });
    }

    const initialPage = 'start';
    loadPage(initialPage);
});
