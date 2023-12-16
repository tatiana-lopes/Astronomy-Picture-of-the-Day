const NASA_API_KEY = 'BcHQjyNWDJMWA9KbF9rjEXpLbZFMr42UD7OrTEzU';
const NASA_API_URL = 'https://api.nasa.gov/planetary/apod';

class NASAImage {
    constructor(copyright,date, explanation, hdUrl, mediaType, title, url) {
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
        this._fetchSpecificDate = this._fetchSpecificDate.bind(this);

        // Replace with your HTML elements or IDs
        this.apodContainer = document.getElementById('apod-container');
        this.fetchButton = document.getElementById('fetch-specific-date');

        this.fetchButton.addEventListener('click', this._fetchSpecificDate);
        this.localStoragePrefix = 'nasa_apod_'; // Prefix for keys in local storage
        this.maxLocalStorageSize = 5 * 1024 * 1024; // Maximum allowed size (5MB here)

        // Define localStorageKey property to store the key
        this.localStorageKey = null;

    }

    _fetchSpecificDate() {
        let formattedDate = null;

        // Get the specific date from the input field if it is not empty
        if(document.getElementById('date').value){
        const selectedDate = document.getElementById('date').value;
        formattedDate = selectedDate.split('-').join('-');
        } else {
            
        // Get today's date in YYYY-MM-DD format (New York time from nasa api)
            const dateInNewYork = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
            const dateObj = new Date(dateInNewYork); 
            const year = dateObj.getFullYear();
            const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
            const day = ('0' + dateObj.getDate()).slice(-2);
            formattedDate = `${year}-${month}-${day}`;
        }

        this.localStorageKey = this.localStoragePrefix + formattedDate;
        console.log('local storage key: ',this.localStorageKey);
        if (localStorage.getItem(this.localStorageKey)){
          console.log('loading from localStorage without API')
          this._renderAPOD(this.localStorageKey);
        } else {
        const apiUrl = `${NASA_API_URL}?api_key=${NASA_API_KEY}&date=${formattedDate}`;

        fetch(apiUrl)
            .then(this._onResponse)
            .then(this._onJsonReady)
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
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

        // unique key based on the date for local storage
        const localStorageKey = this.localStoragePrefix + nasaImage.date;
        console.log('data copyright: ', nasaImage.copyright);
       
        // if the key does not exist in the local storage yet, then store the data in that new key
        if (!localStorage.getItem(localStorageKey)) {

            try {
                localStorage.setItem(localStorageKey, JSON.stringify(nasaImage));
                console.log('new data: ', data);
                console.log('new localStorage key: ', localStorageKey);

                // Manage local storage size by removing the oldest entry if size exceeds limit
                this._manageLocalStorageSize();
            } catch (error) {
                console.error('Error storing data in local storage:', error);
            }
        }
        console.log('existing data: ', data);
        console.log('existing localStorage key: ', localStorageKey);
        this._renderAPOD(localStorageKey);
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

    _renderAPOD(localStorageKey) {
        const savedData = localStorage.getItem(localStorageKey);

        if (savedData) {
            const parsedData = JSON.parse(savedData);

             const titleElement = document.createElement('h2');
            titleElement.textContent = parsedData.title;

            const imageElement = document.createElement('img');
            imageElement.src = parsedData.url;
            imageElement.alt = parsedData.title;

            const dateElement = document.createElement('p');
            dateElement.textContent = parsedData.date;

           
            const explanationElement = document.createElement('p');
            explanationElement.textContent = parsedData.explanation;

            const copyrightElement = document.createElement('p');
            copyrightElement.textContent = parsedData.copyright;

            this.apodContainer.innerHTML = '';
            this.apodContainer.appendChild(titleElement);
            this.apodContainer.appendChild(imageElement);
            this.apodContainer.appendChild(dateElement);
            this.apodContainer.appendChild(explanationElement);
            this.apodContainer.appendChild(copyrightElement);
        }
    }
}

// Instantiate the App class and trigger the fetch on load
const app = new App();
app._fetchSpecificDate();
