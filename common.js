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
        this.imageDataArray = [];
        this.searchResults = document.getElementById('imageResult');
        this.arrayImages = document.getElementById('arrayImagesResults');
        document.getElementById('mediaTypeFilter').addEventListener('change', this._filterByMediaType.bind(this));
        document.getElementById('sorting').addEventListener('change', this._sorting.bind(this));
    }

    // Function to bind event listeners and setup
    init() {
        console.log('DOM loaded');
        const specificDateForm = document.getElementById('specificDateForm');
        const countForm = document.getElementById('countForm');
        const dateRangeForm = document.getElementById('dateRangeForm');

        if (specificDateForm) {
            let specificDateInput = document.getElementById('specificDate');
            this.setMaxDateAttribute(specificDateInput)

            //show the image of today by default
            this._fetchToday();

            //show specific image to the specific date form
            specificDateForm.addEventListener('submit', this._fetchSpecificDate.bind(this));
        }

        if (countForm) {
            this._displayInitialRandomImages();
            countForm.addEventListener('submit', this._fetchRandomImages.bind(this));
        }

        if (dateRangeForm) {
            let startDateInput = document.getElementById('startDate');
            let endDateInput = document.getElementById('endDate');
            this.setMaxDateAttribute(startDateInput);
            this.setMaxDateAttribute(endDateInput);

            //if the start date changes, update the min date of the end date
            startDateInput.addEventListener('change', this.setMinDateAttribute.bind(this, endDateInput));
            startDateInput.addEventListener('change', this.setMaxDateAttribute.bind(this, endDateInput));

            this._displayInitialGalleryImages();
            //console.log('range date form: ', dateRangeForm)
            dateRangeForm.addEventListener('submit', this._fetchDateRange.bind(this));
        }
    }

    generalFetch(apiUrl) {
        fetch(apiUrl)
            .then(this._onResponse)
            .then(this._onJsonReady)
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }

    setMaxDateAttribute(inputElement) {
        //if the input element is the start date, set the max date to one day before today
        if (inputElement.id === 'startDate') {
            const today = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
            const dateObj = new Date(today);
            dateObj.setDate(dateObj.getDate() - 1);
            const year = dateObj.getFullYear();
            const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
            const day = ('0' + dateObj.getDate()).slice(-2);
            let formattedDate = `${year}-${month}-${day}`;
            inputElement.setAttribute('max', formattedDate);

        } else if (inputElement.id === 'endDate') {
            let startDate = document.getElementById('startDate').value;
            let dateObj = new Date(startDate);
            dateObj.setDate(dateObj.getDate() + 31);

            // set the maximum date to either 31 days from the start date or today's date if the start date is more than 31 days ago
            const today = new Date();
            const maxDate = new Date(Math.min(dateObj, today));
            const year = maxDate.getFullYear();
            const month = ('0' + (maxDate.getMonth() + 1)).slice(-2);
            const day = ('0' + maxDate.getDate()).slice(-2);
            let formattedDate = `${year}-${month}-${day}`;
            inputElement.setAttribute('max', formattedDate);
        }
        else {
            // Get today's date in YYYY-MM-DD format based on new york time
            const today = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }).slice(0, 10);
            const dateObj = new Date(today);
            const year = dateObj.getFullYear();
            const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
            const day = ('0' + dateObj.getDate()).slice(-2);
            let formattedDate = `${year}-${month}-${day}`;
            inputElement.setAttribute('max', formattedDate);
        }
    }

    setMinDateAttribute(inputElement) {
        //if the input element is the end date, set the min date to one day after the start date
        if (inputElement.id === 'endDate') {
            let startDate = document.getElementById('startDate').value;
            const dateObj = new Date(startDate);
            dateObj.setDate(dateObj.getDate() + 1);
            const year = dateObj.getFullYear();
            const month = ('0' + (dateObj.getMonth() + 1)).slice(-2);
            const day = ('0' + dateObj.getDate()).slice(-2);
            let formattedDate = `${year}-${month}-${day}`;
            inputElement.setAttribute('min', formattedDate);
        }
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
        this.imageDataArray = [];

        //handle multiple images
        if (Array.isArray(data)) {
            this.imageDataArray = data;
            console.log('multiple images: ', data)
            this._renderImages(this.imageDataArray);

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

    _displayInitialGalleryImages() {
        // Get today's date in New York timezone
        const dateInNewYork = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
        const endDate = new Date(dateInNewYork);

        // Calculate the start date 31 days prior to today
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 13); // Start date is 14 days before today

        const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&start_date=${startDate.toISOString().slice(0, 10)}&end_date=${endDate.toISOString().slice(0, 10)}`;
        this.generalFetch(apiUrl);
    }

    _displayInitialRandomImages() {
        //random generator for the count between 2 and 14
        const count = Math.floor(Math.random() * 13) + 2;
        document.getElementById('count').value = count;
        const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&count=${count}`;
        this.generalFetch(apiUrl);
    }

    _fetchRandomImages(event) {
        event.preventDefault();
        const count = document.getElementById('count').value;
        const apiUrl = `${NASA_API_URL}?api_key=${SECRET_API_KEY}&count=${count}`;
        this.generalFetch(apiUrl);
    }

    _renderAPOD(localStorageKey) {
        const savedData = localStorage.getItem(localStorageKey);
        console.log('saved data: ', savedData);
        const filterDivs = document.getElementById('filterDivs');

        let imageTitle = document.getElementById('imageTitle');
        let imageDate = document.getElementById('imageDate');
        let imageOrVideo = document.getElementById('imageOrVideo');
        let imageCopyright = document.getElementById('imageCopyright');
        let imageExplanation = document.getElementById('imageExplanation');
        // Hide the filter divs because we are showing a single image
        filterDivs.style.display = 'none';

        //clear the previous search results
        imageTitle.textContent = '';
        imageDate.textContent = '';
        imageOrVideo.innerHTML = '';
        imageExplanation.textContent = '';
        imageCopyright.textContent = '';
        this.arrayImages.innerHTML = '';
        const parsedData = JSON.parse(savedData);

        //update the image title
        imageTitle.textContent = parsedData.title;
        imageDate.textContent = parsedData.date;

        //only diplay the copyright if it exists
        if (parsedData.copyright) {
            imageCopyright.innerHTML = "<b>Copyright: </b>" + parsedData.copyright;
        }

        imageExplanation.innerHTML = "<b>Explanation: </b>" + parsedData.explanation;
        if (parsedData.mediaType === 'image') {
            const imageElement = document.createElement('img');
            imageElement.src = parsedData.url;
            imageElement.alt = parsedData.title;
            imageOrVideo.appendChild(imageElement);
        }
        else if (parsedData.mediaType === 'video') {
            const videoElement = document.createElement('iframe');
            videoElement.src = parsedData.url;
            videoElement.width = 640;
            videoElement.height = 360;
            videoElement.frameBorder = 0;
            videoElement.allow = 'encrypted-media';
            videoElement.allowFullscreen = true;
            imageOrVideo.appendChild(videoElement);
        }
    }

    _renderImages(imageDataArray) {
        const arrayImages = document.getElementById('arrayImagesResults');
        const filterDivs = document.getElementById('filterDivs');
        const focusedImage = document.getElementById('focusedImage');
        const focusedImg = document.getElementById('focusedImg');
        const focusedExplanation = document.getElementById('focusedExplanation');
        const closeButton = document.querySelector('.closeButton');
        let focusedImageTitle = document.getElementById('focusedImageTitle');
        let focusedImageDate = document.getElementById('focusedImageDate');
        let focusedImageCopyright = document.getElementById('focusedImageCopyright');

        this.arrayImages.innerHTML = '';
        this.filteredImageData = []; // Reset filtered image data

        imageDataArray.forEach(imageData => {
            const imageDiv = document.createElement('div');
            imageDiv.classList.add('imageResult');

            const imageContent = document.createElement('div');
            imageContent.classList.add('imageContent');

            const titleElement = document.createElement('h2');
            titleElement.textContent = imageData.title;
            // Append each image to the container  
            imageDiv.appendChild(titleElement);

            const dateElement = document.createElement('h3');
            dateElement.textContent = imageData.date;
            imageDiv.appendChild(dateElement);

            if (imageData.media_type === 'image') {
                //create a button which is the image
                let imageButton = document.createElement('button');
                imageButton.classList.add('imageButton');
                imageContent.appendChild(imageButton);
                const imageElement = document.createElement('img');

                //stretch the image to the width of the image div
                //set the width and height from the image
                imageElement.width = 300;
                imageElement.height = 300;
                imageElement.style.width = '100%';
                imageElement.style.height = '100%';
                imageElement.src = imageData.url;
                imageElement.alt = imageData.title; imageButton.appendChild(imageElement);


            } else if (imageData.media_type === 'video') {
                const videoElement = document.createElement('iframe');
                videoElement.src = imageData.url;
                //set the width to the available space of the div and the height to 75% of the width
                videoElement.style.width = '100%';
                videoElement.style.objectFit = 'fill';
                videoElement.frameBorder = 0;
                videoElement.allow = 'encrypted-media';
                videoElement.allowFullscreen = true;
                imageContent.appendChild(videoElement);
            }

            imageDiv.appendChild(imageContent);
            arrayImages.appendChild(imageDiv);

            // Show the filter divs
            filterDivs.style.display = 'flex';
            imageContent.addEventListener('click', () => {
                focusedImage.classList.remove('hidden');
                focusedImg.src = imageData.hdurl;
                focusedImg.alt = imageData.title;
                focusedImageTitle.textContent = imageData.title;
                focusedImageDate.textContent = imageData.date;
                if (imageData.copyright) {
                    focusedImageCopyright.innerHTML = "<b>Copyright:</b> " + imageData.copyright;
                }

                focusedExplanation.innerHTML = "<b>Explanation:</b> " + imageData.explanation;
                focusedExplanation.classList.remove('hidden');
            });

            // Store data for filtering
            this.filteredImageData.push(imageData);
        });

        // Close focused image
        closeButton.addEventListener('click', () => {
            focusedImage.classList.add('hidden');

        });
    }

    _filterByMediaType() {
        let mediaType = document.getElementById('mediaTypeFilter').value;
        this.filteredImageData = this.imageDataArray.slice();

        // Apply media type filter
        if (mediaType !== 'all') {
            this.filteredImageData = this.filteredImageData.filter(item => item.media_type === mediaType);
        } else if (mediaType === 'all') {
            //reset the filtered data to the original data
            this.filteredImageData = this.imageDataArray.slice();
        }

        this._renderImages(this.filteredImageData);
    }

    _sorting() {
        let sorting = document.getElementById('sorting').value;

        // Apply sorting
        if (sorting === 'dateAsc') {
            this._orderByDate('asc');
        } else if (sorting === 'dateDesc') {
            this._orderByDate('desc');
        } else if (sorting === 'titleAsc') {
            this._orderByTitle('asc');
        } else if (sorting === 'titleDesc') {
            this._orderByTitle('desc');
        }
    }

    // Function to order by date
    _orderByDate(order) {
        const storedData = this.filteredImageData;
        const isAscending = order === 'asc';
        storedData.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return isAscending ? dateA - dateB : dateB - dateA;
        });
        this._renderImages(storedData);
    }

    // Function to order by title
    _orderByTitle(order) {

        const storedData = this.filteredImageData;
        const isAscending = order === 'asc';
        storedData.sort((a, b) => {
            const titleA = a.title.toLowerCase();
            const titleB = b.title.toLowerCase();
            return isAscending ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
        });
        this._renderImages(storedData);
    }
}

// instance of the App class and initialize it on load
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
