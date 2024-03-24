// JavaScript Document
var station = undefined
var locationid = null;
var fromDate = null;
var toDate = null;

function reportConversion(type) {
	if(type == 'call') {
		gtag('event', 'call')
		fbq('track', 'Contact');
	} else if(type == 'priceinfo') {
		gtag('event', 'priceinfo');
		fbq('track', 'InitiateCheckout');
	}
	
}
function setLocation(id) {
	station = settings.locations.find(x=> x.id === id)
	locationid = id
	const h5 = document.querySelector('#extraCosts')
	if (h5) {
		h5.parentElement.removeChild(h5)
	}
	const costhtml = $(`<h5 id="extraCosts">zzgl. € <span id="transfer_costs">${station.price}</span> Standortzuschlag</h5>`).hide().fadeIn()
	$("#costs-div").append(costhtml)
	$("#btn-first").removeClass("disabled")
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function valDate(rentalsd, rentalst, rentaled, rentalet) {
	 if(!rentalsd || !rentalst || !rentaled || !rentalet)
		return false;
	
	startTime = rentalst.split(':')
	endTime = rentalet.split(':')
	
	fromDate = new Date(rentalsd.getFullYear(), rentalsd.getMonth(), rentalsd.getDate(), startTime[0], startTime[1])	
	toDate = new Date(rentaled.getFullYear(), rentaled.getMonth(), rentaled.getDate(), endTime[0], endTime[1])
	
	if(toDate.getTime() - fromDate.getTime() <= 0) {
		$("#rental-end-time").addClass("error")
		$("#rental-end-date").addClass("error")
		return false;
	}
	x = fromDate
	y = toDate
	return x && y;
}

function loadFrame(rentalsd, rentalst, rentaled, rentalet) {
	let ok = true;
	// check if filled out
	if(station == undefined) {
		ok = false
		$("#rental-station").addClass("error")
	} else if(!rentalsd || !rentalst || !rentaled || !rentalet) {
		ok = false;
		$("#rental-start-date").addClass("error")
		$("#rental-start-time").addClass("error")
		$("#rental-end-date").addClass("error")
		$("#rental-end-time").addClass("error")
	}
	
	// validate dates
	if(!valDate(rentalsd, rentalst, rentaled, rentalet)) {
		ok = false;
	} else {	
		// set fromDate & toDate
		startTime = rentalst.split(':')
		endTime = rentalet.split(':')
		
		fromDate = Math.floor(fromDate / 1000)	
		toDate = Math.floor(toDate / 1000)
	}
	
	if(ok) {
		if(getUrlParameter("mode") == "test") {
			window.location.replace(`https://reservation.dc-rent.de/index.html?location=${locationid}&fromdate=${fromDate}&todate=${toDate}`)
		} else {
			// Send Conversions
			reportConversion('priceinfo')
			window.location.replace(`https://www.dc-rent.de/reservation/index.html?location=${locationid}&fromdate=${fromDate}&todate=${toDate}`)
		}
	}
}

const btnFirst = $('#btn-first')
btnFirst.click(() =>{
	loadFrame(fromDate, $("#rental-start-time").val(), toDate, $("#rental-end-time").val())
})


// VUE JS
  
let vueobj = new Vue({
  delimiters: ['[[', ']]'],
  el: '#vueInstance',
  data() {
	return {
	  timeout: null,
	  placesService: undefined,
	  isOpen: false,
	  stationInput: '',
	  autocompleteSource: [],
	  sessionToken: '',
	  rentalLocations: [],
	  currentAutoGeoCompletion: '',
	  showSingleResultDistance: 7.0,
	  showMaxLocationResults: 5
	}
  },
  methods: {
	onChange() {
		this.stationInput !== '' ? this.isOpen = true : this.isOpen = false
		if (this.stationInput.length > 2) {
			if(this.timeout) {
				clearTimeout(this.timeout)
				this.timeout = null
			}
			this.timeout = setTimeout(() => {
				this.autoComplete(this.stationInput, this.rentalLocations, this.autocompleteSource, this.fillAutocompleteSource, this.currentAutoGeoCompletion)
			}, 2500)
		}
	},

	// Fills autocomplete rental-location list. Needs sorted map, distance ascending.
	fillAutocompleteSource(map, currentGeoAutocomplete) {

		// Set data on current origin for geo distance search.
		this.currentAutoGeoCompletion = currentGeoAutocomplete;

		// Reset data on Autocompletion-suggestions.
		this.autocompleteSource = [];

		var foundStationNear = false, amountPushed = 0;
		for (let [key, value] of map) {
			town = key
			if (foundStationNear == false && this.showMaxLocationResults > amountPushed) {
				this.autocompleteSource.push({ street: town.street, postal: town.plz, value: town.name, surcharge: town.price, distance: value });
				amountPushed++;
				$('.current-auto-complete').show()
				$('.jk-autocomplete-result').removeClass('active')
				$('.jk-autocomplete-results-hint').show()
			}

			if (this.showSingleResultDistance > value) {
				foundStationNear = true;
				$('.current-auto-complete').hide()
				$('.jk-autocomplete-result').addClass('active')
			}

		}

	},

	autoComplete(str, rentalLocs, autocompleteSource, fillAutocompleteSourceFunc, currentAutoGeoCompletion) {
		// Create Google AutoCompleteService.
		var service = new google.maps.places.AutocompleteService();
		// Perform request.
		var request = {
   			types: ['(cities)'],
			input: str,
			componentRestrictions: {country: ['de', 'at', 'ch', 'it']}/*,
			sessionToken: this.sessionToken*/
		};
		service.getPlacePredictions(request, callback);
		
		// Google Places Autocomplete callback.
		async function callback(response, status) {

			var origin;
			try {
				origin = response[0].description;
				currentAutoGeoCompletion = response[0].description;
			} catch (e) {
				return;
			}
			
			let stationrequest = ""
			let request = ""
			var distanceRentalLocationMap = new Map();
			
			// Google Maps API
			
			let rentalLocsCities = []
			rentalLocs.forEach(function(elm, i) {
				rentalLocsCities.push(elm.plz + " " + elm.name)
			})
			
			var service = new google.maps.DistanceMatrixService();
			service.getDistanceMatrix(
			{
				origins: [origin],
				destinations: rentalLocsCities,
				travelMode: 'DRIVING',
			}, callback);
			
			// Google DistanceMatrixService callback.
			function callback(response, status) {
				var tempDistance = 0, i = 0, stringDistance = '', tmpStringDistance = '', charIndex = 0;
				var resultDistances = [];
				if (response == null) {
					fillAutocompleteSourceFunc(distanceRentalLocationMap, 'Ort nicht gefunden');
					$('.current-auto-complete').show()
					$('.jk-autocomplete-results-hint').hide()
					return;
				}
				
				for (element of response.rows) {
					let i = 0
					for (innerElement of element.elements) {
						
						if (innerElement.status == 'ZERO_RESULTS') {
							fillAutocompleteSourceFunc(distanceRentalLocationMap, 'Ort nicht gefunden');
							$('.current-auto-complete').show()
							$('.jk-autocomplete-results-hint').hide()
							return;
						}

						stringDistance = innerElement.distance.value / 1000
						tempDistance = parseFloat(stringDistance);
						tempDistance = parseInt(tempDistance.toFixed(1));

						// Fill Location-Distance map.
						rentalLocsRes = rentalLocs[i]
						distanceRentalLocationMap.set(rentalLocsRes, tempDistance);
						i++;
					}	
					// Sort the Rental-Location by distance, ascending.
					distanceRentalLocationMap[Symbol.iterator] = function* () {
						yield* [...this.entries()].sort((a, b) => a[1] - b[1]);
					}
					// Fill values outside of callback for the autocomplete-suggestion.
					fillAutocompleteSourceFunc(distanceRentalLocationMap, origin)
				}
			}
			
			// hide loading spinner
			$(".loadingspinner").hide()
			
			// END GOOGLE MAPS API
			
		}
	},

	// Handle selected location.
	setResult(selectedItem) {
		for (var element of settings.locations) {
			if(element.name == selectedItem) {
				setLocation(element.id);
				this.stationInput = selectedItem;
				this.isOpen = false;
			}
		}
	}

  },

  computed: {
	//
  },

  created() {
	this.sessionToken  = new google.maps.places.AutocompleteSessionToken();

	this.placesService = new google.maps.places.PlacesService($('#predicted-places').get(0));
	  
	for (var element of settings.locations) {
		this.rentalLocations.push({ street: element.street, plz: element.plz, price: element.price , name: element.name});
	}
  }
})


// Initialization

// timepicker
$('.timepicker').timepicker({
	timeFormat: 'HH:mm',
	interval: 30,
	minTime: '9',
	maxTime: '16:30',
	defaultTime: '9',
	dropdown: true,
	dynamic:false,
	scrollbar: true
	
})

today = new Date()
new dateDropper({
  selector: '.airpicker',
  format: 'dd. M',
  lang: 'de',
  showArrowsOnHover: false,
  expandedOnly: true,
  doubleView: true,
  startFromMonday: true,
  minDate: today.getFullYear() + '/' + (today.getMonth()+1) + '/' + today.getDate(),
  range: true,
  onRangeSet: function(range) {
	var start = fromDate = new Date(range.a.U*1000)
	var end = toDate = new Date(range.b.U*1000)
	startDay = start.getDay()
	endDay = end.getDay()
	
	if(startDay == 0) {
		$('#rental-start-time').data('TimePicker').options.minTime = '12'
		$('#rental-start-time').data('TimePicker').options.maxTime = '12'
		$('#rental-start-time').val('12:00')
		$('#rental-start-time').data('TimePicker').items = null;
		$('#rental-start-time').data('TimePicker').widget.instance = null;
		
	} else if(startDay == 6) {
		$('#rental-start-time').data('TimePicker').options.minTime = '9'
		$('#rental-start-time').data('TimePicker').options.maxTime = '12'
		$('#rental-start-time').val('09:00')
		$('#rental-start-time').data('TimePicker').items = null;
		$('#rental-start-time').data('TimePicker').widget.instance = null;
	} else {
		$('#rental-start-time').data('TimePicker').options.minTime = '9'
		$('#rental-start-time').data('TimePicker').options.maxTime = '16:30'
		$('#rental-start-time').val('09:00')
		$('#rental-start-time').data('TimePicker').items = null;
		$('#rental-start-time').data('TimePicker').widget.instance = null;
	}
	  
	if(endDay == 0) {
		$('#rental-end-time').data('TimePicker').options.minTime = '12'
		$('#rental-end-time').data('TimePicker').options.maxTime = '12'
		$('#rental-end-time').val('12:00')
		$('#rental-end-time').data('TimePicker').items = null;
		$('#rental-end-time').data('TimePicker').widget.instance = null;
	} else if(endDay == 6) {
		$('#rental-end-time').data('TimePicker').options.minTime = '9'
		$('#rental-end-time').data('TimePicker').options.maxTime = '10'
		$('#rental-end-time').val('09:00')
		$('#rental-end-time').data('TimePicker').items = null;
		$('#rental-end-time').data('TimePicker').widget.instance = null;
	} else if(endDay == 5) {
		// friday return until noon
		$('#rental-end-time').data('TimePicker').options.minTime = '9'
		$('#rental-end-time').data('TimePicker').options.maxTime = '12'
		$('#rental-end-time').val('09:00')
		$('#rental-end-time').data('TimePicker').items = null;
		$('#rental-end-time').data('TimePicker').widget.instance = null;
	} else {
		$('#rental-end-time').data('TimePicker').options.minTime = '9'
		$('#rental-end-time').data('TimePicker').options.maxTime = '16:30'
		$('#rental-end-time').val('09:00')
		$('#rental-end-time').data('TimePicker').items = null;
		$('#rental-end-time').data('TimePicker').widget.instance = null;
	}
  }
});