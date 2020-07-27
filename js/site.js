/* global i18n */
/* global L */
/* global confetti */

/* select language to use */
var onOSMlang = 'it-IT';

var successString, manualPosition, loadingText, modalText;

i18n.init({
  fallbackLng: 'it-IT',
  lngWhitelist: ['en-GB', 'it-IT'],
  postAsync: 'false'
}, function () {
  $('body').i18n();
  successString = i18n.t('messages.success', {
    escapeInterpolation: false
  });
  manualPosition = i18n.t('messages.manualPosition', {
    escapeInterpolation: false
  });
  loadingText = i18n.t('messages.loadingText');
  modalText = {};
  modalText.text = i18n.t('messages.modalTitle');
  modalText.button = i18n.t('messages.modalButton');

  onOSMlang = i18n.lng();
  $.getJSON('./locales/' + onOSMlang + '/categories.json').success(function (data) {
    categoryData = data;
  });

  $.getJSON('./locales/' + onOSMlang + '/payment.json').success(function (data) {
    paymentData = data;
  });
});

/* HERE BE DRAGONS */
var findmeMap = L.map('findme-map')
  .setView([41.69, 12.71], 5);
var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
var osm = L.tileLayer(osmUrl, {
  minZoom: 2,
  maxZoom: 18,
  attribution: 'Data &copy; OpenStreetMap contributors'
}).addTo(findmeMap);
var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var baseMaps = {
  Mapnik: osm,
  'Esri WorldImagery': esri
};
L.control.layers(baseMaps).addTo(findmeMap);

var categoryData = [];
var paymentData = [];

var findmeMarker = L.marker([41.69, 12.71], {
  draggable: true
}).addTo(findmeMap);
findmeMarker.setOpacity(0);

L.control.locate({
  follow: true
}).addTo(findmeMap);

if (location.hash) location.hash = '';

$('#category').select2({
  query: function (query) {
    var data = {
      results: []
    };
    var i;
    for (i = 0; i < categoryData.length; i++) {
      if (query.term.length === 0 || categoryData[i].toLowerCase().indexOf(query.term.toLowerCase()) >= 0) {
        data.results.push({
          id: categoryData[i],
          text: categoryData[i]
        });
      }
    }
    query.callback(data);
  }
});

$('#payment').select2({
  multiple: true,
  query: function (query) {
    var data = {
      results: []
    };
    data.results = paymentData;
    query.callback(data);
  }
});

/* search action */
$('#find').submit(function (e) {
  e.preventDefault();
  $('#couldnt-find').hide();
  var addressToFind = $('#address').val();
  if (addressToFind.length === 0) return;

  /* NOMINATIM PARAM */
  var qwargNominatim = {
    format: 'json',
    q: addressToFind,
    addressdetails: 1,
    namedetails: 1
  };
  var urlNominatim = 'https://nominatim.openstreetmap.org/search?' + $.param(qwargNominatim);

  $('#findme h4').text(loadingText);
  $('#findme').addClass('progress-bar progress-bar-striped progress-bar-animated');

  $.ajax({
    url: urlNominatim,
    success: nominatimCallback,
    dataType: 'jsonp',
    jsonp: 'json_callback'
  });
});

function nominatimCallback (data) {
  if (data.length > 0) {
    var chosenPlace = data[0];

    var bounds = new L.LatLngBounds(
      [+chosenPlace.boundingbox[0], +chosenPlace.boundingbox[2]],
      [+chosenPlace.boundingbox[1], +chosenPlace.boundingbox[3]]);

    findmeMap.fitBounds(bounds);
    findmeMarker.setOpacity(1);
    findmeMarker.setLatLng([chosenPlace.lat, chosenPlace.lon]);
    $('#step2').removeClass('disabled');
    $('#continue').removeClass('disabled');
    $('.step-2 a').attr('href', '#details');
    $('#addressalt').val(chosenPlace.address.road);
    $('#hnumberalt').val(chosenPlace.address.house_number);
    $('#city').val(chosenPlace.address.village || chosenPlace.address.town || chosenPlace.address.city);
    $('#postcode').val(chosenPlace.address.postcode);
    $('#address').val(chosenPlace.display_name);
    $('#map-information').html(successString);
    $('#map-information').show();
    if (!chosenPlace.address.house_number) {
      $('#map-information').append('<hr> <i class="twa twa-warning"></i> ' + i18n.t('step1.nohousenumber'));
    }
    $('#address').addClass('is-valid');
    $('#address').removeClass('is-invalid');
  } else {
    $('#couldnt-find').show();
    $('#map-information').hide();
    $('#address').addClass('is-invalid');
    $('#address').removeClass('is-valid');
  }
  $('#findme').removeClass('progress-bar progress-bar-striped progress-bar-animated');
}

/* map action */
findmeMap.on('click', function (e) {
  findmeMarker.setOpacity(1);
  findmeMarker.setLatLng(e.latlng);
  $('#map-information').html(manualPosition);
  $('#map-information').show();
  $('.step-2 a').attr('href', '#details');
  $('#step2').removeClass('disabled');
  $('#continue').removeClass('disabled');
});

$(window).on('hashchange', function () {
  if (location.hash === '#details') {
    $('#collect-data-step').removeClass('d-none');
    $('#address-step').addClass('d-none');
    $('#confirm-step').addClass('d-none');
    $('#step2').addClass('active bg-success');
    $('#step3').removeClass('active bg-success');
  } else if (location.hash === '#done') {
    $('#confirm-step').removeClass('d-none');
    $('#collect-data-step').addClass('d-none');
    $('#address-step').addClass('d-none');
    $('#step3').addClass('active bg-success');
    confetti.start(1000);
  } else {
    $('#address-step').removeClass('d-none');
    $('#collect-data-step').addClass('d-none');
    $('#confirm-step').addClass('d-none');
    $('#step2').removeClass('active bg-success');
    $('#step3').removeClass('active bg-success');
  }
  findmeMap.invalidateSize();
});

// Disables the input if delivery is not checked
$('#delivery-check').prop('indeterminate', true);
$(function () { deliveryCheck(); $('#delivery-check').click(deliveryCheck); });
function deliveryCheck () { if (this.checked) { enableDelivery(); } else { disableDelivery(); } }

function disableDelivery () { $('#delivery').attr('disabled', true); $('#delivery_description').attr('disabled', true); $('#label-delivery-check').html(i18n.t('step2.no')); }
function enableDelivery () { $('#delivery').removeAttr('disabled'); $('#delivery_description').removeAttr('disabled'); $('#label-delivery-check').html(i18n.t('step2.yes')); }

function getNoteBody () {
  var paymentIds = [];
  var paymentTexts = [];
  $.each($('#payment').select2('data'), function (_, e) {
    paymentIds.push(e.id);
    paymentTexts.push(e.text);
  });

  var note = "E' stata inviata una nota tramite su.openstreetmap.it:\n";
  if ($('#name').val()) note += i18n.t('step2.name') + ': ' + $('#name').val() + '\n';
  if ($('#phone').val()) note += i18n.t('step2.phone') + ': ' + $('#phone').val() + '\n';
  if ($('#website').val() !== 'https://') note += i18n.t('step2.website') + ': ' + $('#website').val() + '\n';
  if ($('#social').val()) note += i18n.t('step2.social') + ': ' + $('#social').val() + '\n';
  if ($('#opening_hours').val()) note += i18n.t('step2.opening') + ': ' + $('#opening_hours').val() + '\n';
  if ($('#wheel').val()) note += i18n.t('step2.wheel') + ': ' + $('#wheel').val() + '\n';
  if ($('#category').val()) note += i18n.t('step2.catlabel') + ': ' + $('#category').val() + '\n';
  if ($('#categoryalt').val()) note += i18n.t('step2.cataltdesc') + ': ' + $('#categoryalt').val() + '\n';
  if ($('#addressalt').val()) note += i18n.t('step2.addressaltdesc') + ': ' + $('#addressalt').val() + ' ' + $('#hnumberalt').val() + ', ' + $('#postcode').val() + ' ' + $('#city').val() + '\n';
  if (paymentIds) note += i18n.t('step2.payment') + ': ' + paymentTexts.join(',') + '\n';
  if ($('input:checked[name=delivery-check]').val() && $('#delivery').val()) {
    note += i18n.t('step2.deliverydesc') + ": " + $('#delivery').val() + '\n';
  } else if ($('input:checked[name=delivery-check]').val() && !$('#delivery').val()) {
    note += i18n.t('step2.deliverydesc') + ": " + i18n.t('step2.yes') + '\n';
  } else if ($('#delivery-check').not(':indeterminate')) {
    note += i18n.t('step2.deliverydesc') + ": " + i18n.t('step2.no') + '\n';
  }
  if ($('#delivery_description').val()) note += i18n.t('step2.delivery_descriptiondesc') + ': ' + $('#delivery_description').val() + '\n';
  if ($('input:checked[name=takeaway]').val() === 'yes') note += i18n.t('step2.takeawaydesc') + ': ' + i18n.t('step2.yes') + '\n';
  if ($('input:checked[name=takeaway]').val() === 'only') note += i18n.t('step2.takeawaydesc') + ': ' + i18n.t('step2.only_takeaway') + '\n';
  if ($('#takeaway_description').val()) note += i18n.t('step2.takeaway_descriptiondesc') + ': ' + $('#takeaway_description').val() + '\n';

  note += '\nTag suggeriti: (⚠️ = ' + i18n.t('messages.needsChecking') + ')\n';
  if ($('#name').val()) note += 'name=' + $('#name').val() + '\n';
  if ($('#addressalt').val()) note += 'addr:street=' + $('#addressalt').val() + '\n';
  if ($('#hnumberalt').val()) note += 'addr:housenumber=' + $('#hnumberalt').val() + '\n';
  if ($('#city').val()) note += 'addr:city=' + $('#city').val() + '\n';
  if ($('#postcode').val()) note += 'addr:postcode=' + $('#postcode').val() + '\n';
  if ($('#phone').val()) note += '⚠️ contact:phone|mobile=' + $('#phone').val() + '\n';
  if ($('#website').val() !== 'https://') note += 'contact:website=' + $('#website').val() + '\n';
  if ($('#social').val()) note += '⚠️ contact:facebook|instagram|other=' + $('#social').val() + '\n';
  if ($('#opening_hours').val()) note += '⚠️ opening_hours=' + $('#opening_hours').val() + '\n';
  if ($('#wheel').val()) note += 'wheelchair=' + $('#wheel').val() + '\n';
  if ($('#categoryalt').val()) note += 'description=' + $('#categoryalt').val() + '\n';
  if (paymentIds) note += paymentIds.join('\n') + '\n';
  if ($('input:checked[name=delivery-check]').val() && $('#delivery').val()) {
    note += '⚠️ delivery=' + $('#delivery').val() + '\n';
  } else if ($('input:checked[name=delivery-check]').val() && !$('#delivery').val()) {
    note += 'delivery=yes' + '\n';
  } else if ($('#delivery-check').not(':indeterminate')) {
    note += 'delivery=no' + '\n';
  }
  if ($('#delivery_description').val()) note += 'delivery:description=' + $('#delivery_description').val() + '\n';
  if ($('input:checked[name=takeaway]').val()) note += 'takeaway=' + $('input:checked[name=takeaway]').val() + '\n';
  if ($('#takeaway_description').val()) note += 'takeaway:description=' + $('#takeaway_description').val() + '\n';
  if ($('input:checked[name=delivery_covid]').val() === 'Y') note += 'delivery:covid19=yes\n';
  if ($('input:checked[name=takeaway_covid]').val() === 'yes' || $('input:checked[name=takeaway_covid]').val() === 'only') note += 'takeaway:covid19=' + $('input:checked[name=takeaway_covid]').val() + '\n';
  if ($('#delivery_covid_description').val() || $('#takeaway_covid_description').val()) note += 'description:covid19=';
  if ($('#delivery_covid_description').val()) note += $('#delivery_covid_description').val() + ' ';
  if ($('#takeaway_covid_description').val()) note += $('#takeaway_covid_description').val() + '\n';
  return note;
}

$('#collect-data-done').click(function () {
  location.hash = '#done';

  var latlon = findmeMarker.getLatLng();
  var qwarg = {
    lat: latlon.lat,
    lon: latlon.lng,
    text: getNoteBody()
  };

  $.post('https://master.apis.dev.openstreetmap.org/api/0.6/notes.json', qwarg, function (data) {
    // console.log(data);
    var noteId = data.properties.id;
    var link = 'https://master.apis.dev.openstreetmap.org/?note=' + noteId + '#map=19/' + latlon.lat + '/' + latlon.lng + '&layers=N';
    $('#linkcoords').append('<div class="mt-3 h4"><a href="' + link + '">' + link + '</a></div>');
  });
});

/* eslint-disable no-unused-vars */
function clearFields () {
  $('#form')[0].reset();
  $('#address').val('');
  $('#category').select2('val', '');
  $('#payment').select2('val', '');
  $('#delivery-check').val('');
  $('#delivery-check').prop('indeterminate', true);
  disableDelivery();
}

function showTutorial() {
  $('#tutorial').html('<video autoplay class="w-100" controls><source src="tutorial.mkv" type="video/mkv"><source src="tutorial.webm" type="video/webm"></video>');
  $('#tut-button').removeClass('d-block');
  $('#tut-button').addClass('d-none');
}
