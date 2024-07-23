// js/app.js
const applicationId = "app.donkeymobile.pknoudalblas";
const debug = false;

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    let selectedPerson = null;

    async function navigate(page) {
        log(`Navigating to ${page}`);

        if (!localStorage.getItem('token')) {
            log('User is not signed in');
            page = 'login';
        }

        if (window.screen.width > window.screen.height && window.screen.height < 600 && window.screen.width < 1000) {
            log('Small device screen, trying to open full screen');
            openFullScreen();
        }

        app.classList.remove('fade-in'); // Verwijder de fade-in klasse om de animatie te resetten
        app.style.opacity = 0; // Set opacity to 0 to start the fade-in effect

        const response = await fetch(`/views/${page}.html`);
        const html = await response.text();
        app.innerHTML = html;
        currentPage = page;

        // Zorg ervoor dat de init functies async zijn als ze asynchrone operaties uitvoeren
        if (page === 'login') await initLogin();
        if (page === 'start') await initStart();
        if (page === 'select') await initSelect();
        if (page === 'game') await initGame();

        // Pas de fade-in animatie toe na het laden en initialiseren
        app.style.opacity = 1; // Reset opacity to 1 after loading new content
        app.classList.add('fade-in'); // Apply fade-in animation
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
                        Swal.fire({
                            icon: 'error',
                            title: 'Inloggen mislukt',
                            text: 'Controleer je gegevens en probeer het opnieuw.'
                        }
                        )
                    }
                })
                .catch(error => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Inloggen mislukt',
                        text: 'Controleer je gegevens en probeer het opnieuw.'
                    }
                    )
                });
        });
    }

    function initStart() {
        // Get user data
        const user = JSON.parse(localStorage.getItem('user'));

        // Display user profile picture and name
        document.getElementById('profilePicture').src = "https://cdn.donkeymobile.com/" + user.image.thumbnailKey;
        document.getElementById('profileName').innerText = "Welkom, \n" + user.firstName + " " + user.lastName + "!";

        // Log out
        document.getElementById('logout').addEventListener('click', () => {
            logout();
        });

        // Start game
        document.getElementById('start-game').addEventListener('click', () => {
            if (localStorage.getItem('selectedPerson')) {
                Swal.fire({
                    title: 'Er is nog een spel bezig, wil je een nieuw spel starten?',
                    showCancelButton: true,
                    confirmButtonText: 'Ja',
                    cancelButtonText: 'Nee'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.removeItem('selectedPerson');
                        localStorage.removeItem('smoelenboek');
                        navigate('select');
                    } else {
                        navigate('game');
                    }
                }
                )
            } else {
                navigate('select');
            }
        });
    }

    function initSelect() {
        // Set event listener for close game button
        initCloseGameButton();

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

                // save smoelenboek in local storage
                localStorage.setItem('smoelenboek', JSON.stringify(smoelenboek));

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
            })
            .catch(error => {
                Swal.fire({
                    icon: 'info',
                    title: 'Je bent automatisch uitgelogd',
                    text: 'Log opnieuw in om verder te gaan.'
                }
                )
                logout();
            });

        document.getElementById('confirm-selection').addEventListener('click', () => {
            if (selectedPerson !== null) {
                // save selected person
                localStorage.setItem('selectedPerson', JSON.stringify(smoelenboek[selectedPerson]));
                navigate('game');
            } else {
                Swal.fire({
                    title: 'Kies een speler om verder te gaan.'
                }
                )
            }
        });

        document.getElementById('choose-random').addEventListener('click', () => {
            const randomIndex = Math.floor(Math.random() * smoelenboek.length);
            localStorage.setItem('selectedPerson', JSON.stringify(smoelenboek[randomIndex]));
            navigate('game');
        });
    }

    function selectPerson(index, card) {
        if (selectedPerson !== null) {
            document.querySelector('.person-card.selected').classList.remove('selected');
        }
        selectedPerson = index;
        card.classList.add('selected');
        document.getElementById('confirm-selection').removeAttribute('disabled');
    }

    function initGame() {
        // Set event listener for close game button
        initCloseGameButton();

        // Get game data
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

        // Create event listener for selecter-person card
        const selectedPersonCard = document.getElementById('selected-person');
        selectedPersonCard.addEventListener('click', () => {
            // Create a bigger image preview popup
            Swal.fire({
                imageUrl: `https://cdn.donkeymobile.com/${selectedPerson.imageKey}`,
                imageAlt: `${selectedPerson.firstName} ${selectedPerson.lastName}`,
                text: `${selectedPerson.firstName} ${selectedPerson.lastName}`,
                showCloseButton: true,
                showConfirmButton: false
            });
        });

        // Create event listener for hide/show crossed off cards button
        const toggleCrossedOffButton = document.getElementById('toggle-crossed-off');
        var toggleCrossedOff = localStorage.getItem('toggleCrossedOff');

        console.log(toggleCrossedOff);

        if (toggleCrossedOff == 'true') {
            toggleCrossedOffButton.innerText = 'Toon afgestreepte kaarten';

            const crossedOffCards = document.querySelectorAll('.person-card.crossed-off');
            crossedOffCards.forEach(card => {
                card.classList.add('fade-out');
            });
        }

        toggleCrossedOffButton.addEventListener('click', () => {
            var toggleCrossedOff = localStorage.getItem('toggleCrossedOff');
            if (toggleCrossedOff == 'false') {
                localStorage.setItem('toggleCrossedOff', 'true');
                toggleCrossedOffButton.innerText = 'Toon afgestreepte kaarten';

                const crossedOffCards = document.querySelectorAll('.person-card.crossed-off');
                crossedOffCards.forEach(card => {
                    card.classList.add('fade-out');
                });
            } else {
                localStorage.setItem('toggleCrossedOff', 'false');
                toggleCrossedOffButton.innerText = 'Verberg afgestreepte kaarten';

                const crossedOffCards = document.querySelectorAll('.person-card.crossed-off');
                crossedOffCards.forEach(card => {
                    card.classList.remove('fade-out');
                });
            }
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

            // If crossed cards are hidden, hide the crossed card
            var toggleCrossedOff = localStorage.getItem('toggleCrossedOff');
            if (toggleCrossedOff == "true") {
                card.classList.add('fade-out');
            }
        }
    }

    function initCloseGameButton() {
        // Add event listener to close game button
        document.getElementById('closeGame').addEventListener('click', () => {
            Swal.fire({
                title: 'Weet je zeker dat je het spel wilt afsluiten?',
                showCancelButton: true,
                confirmButtonText: 'Ja',
                cancelButtonText: 'Nee'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.removeItem('selectedPerson');
                    localStorage.removeItem('smoelenboek');
                    selectedPerson = null;
                    navigate('start');
                }
            }
            )
        });
    }

    function openFullScreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => { log('Fullscreen not supported') });
        } else if (elem.mozRequestFullScreen) { /* Firefox */
            elem.mozRequestFullScreen().catch(err => { log('Fullscreen not supported') });
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            elem.webkitRequestFullscreen().catch(err => { log('Fullscreen not supported') });
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
            elem.msRequestFullscreen().catch(err => { log('Fullscreen not supported') });
        } else {
            log('Fullscreen not supported');
        }
    }

    function logout() {
        localStorage.clear();
        navigate('login');
    }

    function log(msg, err = false) {
        if (debug) {
            // timestamp log message
            const date = new Date();
            const timestamp = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
            msg = `${timestamp} - [DEBUG] ${msg}`;
            if (err) {
                console.error(msg);
            } else {
                console.log(msg);
            }
        }
    }

    const initialPage = 'start';
    navigate(initialPage);
});
