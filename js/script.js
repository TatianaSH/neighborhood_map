var map;
var infowindow;
var selectedMarker;

//Load and initialize google maps API
function initialize() {
    var pyrmont = new google.maps.LatLng(39.1162627, -77.2016629);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
        center: pyrmont,
        zoom: 16
    });
    var request = {
        location: pyrmont,
        radius: 600,
        types: ['store', 'restaurant', 'movie_theater', 'cafe', 'bar']
    };
    infowindow = new google.maps.InfoWindow(); //global var
    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, callback);
}

function callback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
            results[i].marker = createMarker(results[i]);
            list.push(results[i]);
        }
    }
}

function createMarker(place) {
    var placeLoc = place.geometry.location;
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        customData: place
    });
    google.maps.event.addListener(marker, 'click', function() {
        (new viewModel()).makeInfoWindow(place, marker);
    });
    return marker;
};

google.maps.event.addDomListener(window, 'load', initialize);

//This array (Location List) holds list of places received from google maps API.
var list = ko.observableArray([]);

//View Model. It's support filtering of places from Location List.
var viewModel = function() {
    var self = this;
    this.places = list;
    this.filter = ko.observable();
    this.filtered = ko.computed(function() {
        var filter = self.filter();
        if (!filter) {
            filter = "";
        }
        filter = filter.toLowerCase();
        return ko.utils.arrayFilter(self.places(), function(item) {
            var visible = item.name.toLowerCase().startsWith(filter);
            item.marker.setVisible(visible);
            return visible;
        });
    }, viewModel);

    this.setPlace = function(ClickedPlace) {
        self.makeInfoWindow(ClickedPlace.marker.customData, ClickedPlace.marker);
    };

    this.makeInfoWindow = function(place, marker) {
        readFromYelp(place, function(result) {
            if (result && (!result.error)) {
                //Trying to match name by first 5 letters if Yelp returned more than 1 result.
                for (var i = 0; i < result.businesses.length; i++) {
                    if (place.name.substr(0, 5) == result.businesses[i].name.substr(0, 5)) {
                        break;
                    }
                }
                if (i != result.businesses.length) {
                    html += '<div id ="rating">' + '<img src = " ' + result.businesses[i].rating_img_url + '">' + '</div>' +
                        '<div>' + 'phone: ' + result.businesses[i].display_phone + '</div>' +
                        '<p>' + 'About: ' + '<a href = "' + result.businesses[i].url + '">' + 'link Yelp' + '</a>' + '</p>' +
                        '<div>' + result.businesses[i].snippet_text + '</div>';
                    infowindow.setContent('<div id="iw-container">' + html + '</div>');
                }
            } else {
                html += 'No data from Yelp';
            }
        });

        var html = '<div class="iw-title">' + place.name + '</div>';
        infowindow.setContent('<div id="iw-container">' + html + '</div>');
        infowindow.open(map, marker);
        if (selectedMarker) {
            selectedMarker.setAnimation(null);
        };
        selectedMarker = marker;
        marker.setAnimation(google.maps.Animation.BOUNCE);
        google.maps.event.addListener(infowindow, "closeclick", function() {
            marker.setAnimation(null);
        });
    }
};

ko.applyBindings(new viewModel());

//Load data from Yelp, call onData function on data arrived.
var readFromYelp = function(place, onData) {

    /**
     * Generates a random number and returns it as a string for OAuthentication
     * @return {string}
     */
    function nonce_generate() {
        return (Math.floor(Math.random() * 1e12).toString());
    };

    var yelp_url = 'http://api.yelp.com/v2/search';
    var parameters = {
        oauth_consumer_key: 'cvwk178P0vvGWemEX6QS9g',
        oauth_token: 'hxi6j8e1xcSo7_sDRVuf1ncCWV9PSjCG',
        oauth_nonce: nonce_generate(),
        oauth_timestamp: Math.floor(Date.now() / 1000),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_version: '1.0',
        callback: 'cb', // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
        location: place.vicinity,
        term: place.name,
        sort: 1,
        radius_filter: 200,
        //term: place.types[0],
        cll: '' + place.geometry.location.lat() + ',' + place.geometry.location.lng()
    };

    var encodedSignature = oauthSignature.generate('GET', yelp_url, parameters, 'zRTOVAFsMamtxfiJphYy8SATtL8', 'z21GEJKWNHnVoA_-74WEx3QZiDE');
    parameters.oauth_signature = encodedSignature;

    var settings = {
        url: yelp_url,
        data: parameters,
        cache: true, // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter "_=23489489749837", invalidating our oauth-signature
        dataType: 'jsonp',
        success: function(results) {
            // Do stuff with results
            onData(results);
        },
        error: function(xhr, textStatus, errorThrown) {
            // Do stuff on fail
            console.log('fail ---- ');
            onData(null);
        }
    };

    // Send AJAX query via jQuery library.
    $.ajax(settings);
};