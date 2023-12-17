const SECRET_API_KEY = 'BcHQjyNWDJMWA9KbF9rjEXpLbZFMr42UD7OrTEzU';
const NASA_API_URL = 'https://api.nasa.gov/planetary/apod';

class NASAImage {
    constructor(copyright, date, explanation, hdUrl, mediaType, title, url) {
        this.copyright = copyright;
        this.date = date;
        this.explanation = explanation;
        this.hdUrl = hdUrl;
        this.mediaType = mediaType;
        this.title = title;
        this.url = url;
    }
}

class App {
    constructor() {
        this._onJsonReady = this._onJsonReady.bind(this);
        this._onResponse = this._onResponse.bind(this);
        this.localStorageKey = null;
        this.localStoragePrefix = 'nasa_apod_'; // Prefix for keys in local storage
        this.maxLocalStorageSize = 5 * 1024 * 1024; // Maximum allowed size (5MB)

        this.searchResults = document.getElementById('searchResults');
        this.arrayImages = document.getElementById('arrayImagesResults');
        document.getElementById('specificDateForm').addEventListener('submit', this._fetchSpecificDate.bind(this));
        document.getElementById('dateRangeForm').addEventListener('submit', this._fetchDateRange.bind(this));
        document.getElementById('countForm').addEventListener('submit', this._fetchRandomImages.bind(this));
        document.getElementById('searchByTitleForm').addEventListener('submit', this._fetchByTitle.bind(this));
    }

    generalFetch(apiUrl) {
        fetch(apiUrl)
            .then(this._onResponse)
            .then(this._onJsonReady)
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }

    isImageInLocalStorage() {
        return localStorage.getItem(this.localStorageKey);
    }

    setLocalStorageKey(date) {
        this.localStorageKey = this.localStoragePrefix + date;
    }

    _fetchToday() {
        // Get today's date in YYYY-MM-DD format (New York time from nasa api)
        const dateInNewYork = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
        const dateObj = new Date(dateInNewYork);
        const year = dateObj.getFullYear();
        const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
        const day = ('0' + dateObj.getDate()).slice(-2);
        let formattedDate = `${year}-${month}-${day}`;
        this.setLocalStorageKey(formattedDate);

        if (this.isImageInLocalStorage()) {
            this._renderAPOD(this.localStorageKey);
        } else {
            const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}`;
            this.generalFetch(apiUrl);
        }
    }

    _fetchSpecificDate(event) {
        event.preventDefault();
        let formattedDate = null;
        const selectedDate = document.getElementById('specificDate').value;
        console.log('selected date: ', selectedDate);
        formattedDate = selectedDate.split('-').join('-');
        this.setLocalStorageKey(formattedDate);
        console.log('local storage key: ', this.localStorageKey);
        if (this.isImageInLocalStorage()) {
            console.log('loading from localStorage without API')
            this._renderAPOD(this.localStorageKey);
        } else {
            const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&date=${formattedDate}`;
            this.generalFetch(apiUrl);
        }
    }

    _onJsonReady(data) {
        const nasaImage = new NASAImage(
            data.copyright,
            data.date,
            data.explanation,
            data.hdurl,
            data.media_type,
            data.title,
            data.url,
        );

        //handle multiple images
        if (Array.isArray(data)) {
            console.log('multiple images: ', data)
            this._renderImages(data);
            //handle single image
        } else {
            try {
                localStorage.setItem(this.localStorageKey, JSON.stringify(nasaImage));
                console.log('new data: ', data);

                // Manage local storage size by removing the oldest entry if size exceeds limit
                this._manageLocalStorageSize();
                console.log('existing data: ', data);
                console.log('existing localStorage key: ', this.localStorageKey);
                this._renderAPOD(this.localStorageKey);
            } catch (error) {
                console.error('Error storing data in local storage:', error);
            }
        }
    }

    _onResponse(response) {
        return response.json();
    }

    _manageLocalStorageSize() {
        let totalSize = 0;
        const keysToRemove = [];

        // Calculate total size of stored data and identify keys to remove (oldest first)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.localStoragePrefix)) {
                const itemSize = (localStorage.getItem(key).length * 2); // Approximate size in bytes
                totalSize += itemSize;

                if (totalSize > this.maxLocalStorageSize) {
                    keysToRemove.push(key);
                }
            }
        }

        // Remove the oldest entries that exceed the size limit
        keysToRemove.sort((a, b) => {
            return new Date(a.split('_')[2]) - new Date(b.split('_')[2]);
        });

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
    }

    _fetchDateRange(event) {
        event.preventDefault();
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&start_date=${startDate}&end_date=${endDate}`;
        this.generalFetch(apiUrl);

    }

    _fetchRandomImages(event) {
        event.preventDefault();
        const count = document.getElementById('count').value;
        const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&count=${count}`;

        this.generalFetch(apiUrl);
    }


    _fetchByTitle(event) {
        event.preventDefault();
        const searchWord = document.getElementById('searchWord').value;

        const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&title=${searchWord}`;
        this.generalFetch(apiUrl);
    }

    _renderAPOD(localStorageKey) {
        const savedData = localStorage.getItem(localStorageKey);
        console.log('saved data: ', savedData);

        this.searchResults.innerHTML = '';
        this.arrayImages.innerHTML = '';
        if (savedData) {
            const parsedData = JSON.parse(savedData);

            const titleElement = document.createElement('h2');
            titleElement.textContent = parsedData.title;

            this.searchResults.appendChild(titleElement);

            //display either image or video based on the media type
            if (parsedData.mediaType === 'image') {
                const imageElement = document.createElement('img');
                imageElement.src = parsedData.url;
                imageElement.alt = parsedData.title;
                this.searchResults.appendChild(imageElement);
            } else if (parsedData.mediaType === 'video') {
                const videoElement = document.createElement('iframe');
                videoElement.src = parsedData.url;
                videoElement.width = 640;
                videoElement.height = 360;
                videoElement.frameBorder = 0;
                videoElement.allow = 'encrypted-media';
                videoElement.allowFullscreen = true;
                this.searchResults.appendChild(videoElement);
            }

            const dateElement = document.createElement('p');
            dateElement.textContent = parsedData.date;


            const explanationElement = document.createElement('p');
            explanationElement.textContent = parsedData.explanation;

            const copyrightElement = document.createElement('p');
            copyrightElement.textContent = parsedData.copyright;

            this.searchResults.appendChild(dateElement);
            this.searchResults.appendChild(explanationElement);
            this.searchResults.appendChild(copyrightElement);
        }
    }

    _renderImages(imageDataArray) {
        const arrayImages = document.getElementById('arrayImagesResults');

        this.arrayImages.innerHTML = '';
        this.searchResults.innerHTML = '';

        imageDataArray.forEach(imageData => {
            const titleElement = document.createElement('h3');
            titleElement.textContent = imageData.title;
            // Append each image to the container  
            arrayImages.appendChild(titleElement);

            console.log('image mediatype: ', imageData.media_type);
            if (imageData.media_type === 'image') {

                const imageElement = document.createElement('img');
                imageElement.src = imageData.url;
                imageElement.alt = imageData.title;
                arrayImages.appendChild(imageElement);
            } else if (imageData.media_type === 'video') {
                const videoElement = document.createElement('iframe');
                videoElement.src = imageData.url;
                videoElement.width = 640;
                videoElement.height = 360;
                videoElement.frameBorder = 0;
                videoElement.allow = 'encrypted-media';
                videoElement.allowFullscreen = true;
                arrayImages.appendChild(videoElement);
            }


            const dateElement = document.createElement('p');
            dateElement.textContent = imageData.date;
            const explanationElement = document.createElement('p');
            explanationElement.textContent = imageData.explanation;

            arrayImages.appendChild(dateElement);
            arrayImages.appendChild(explanationElement);

        });
    }
}

// Instantiate the App class and trigger the fetch on load
const app = new App();
app._fetchToday();
