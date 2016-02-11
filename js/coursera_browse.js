/**
CourseraBrowse v: 0.2.2	|	02/11/2016
----------------------------------------------------------
A Chrome Extension that allows browsing of Coursera course
offerings utilizing the publicly available API:
https://tech.coursera.org/app-platform/catalog/

Disclaimer: This application is a 3rd party utilization
of the API, and is NOT an official application of Coursera.
As such, the API can change at any moment and cause the 
extension (or parts of it) to break and stop working without
any advance notice.  

Developed by: Nathan D. Hernandez
			  nathandhernandez _@_ gmail(.com)
			  
===========================================================

coursera_browse.js SPECIFIC:

This is the front javascript file which handles the view for 
popup.html. Accordingly it makes AJAX requests to the Coursera
public API, and generates the HTML shown in the popup.

Interaction and ongoing communication exists between this 
file ('coursera_browse.js') and the background file: ('background.js'). 
Specifically, when the popup is closed by the end-user data and 
messages are sent to 'background.js' in order to save the current
end-user BROWSE-state using the 'chrome.storage.local' api. In this
way, when the user re-opens the popup, they will be presented with
the last HTML view they had before they closed the extension.

version: 0.1.0	|	05/05/2014
	: Initial implementation completed.			@nathandh

version: 0.2.0	|	02/10/2016
	: Adapted to latest Coursera API changes	@nathandh

version: 0.2.1	|	02/10/2016
	: Fixed INSTALL/UPDATE issue with 			@nathandh
      clearing local storage to prevent
	  potential extension load errors/problems
	  
version: 0.2.2	|	02/11/2016
	: Added a catch for '0_last_domains' 		@nathandh
	  response from background.js in order to
	  ensure we call 'getAllDomains()' if we 
	  lack domain data to populate the page.
	: Implemented initial Course time
	  functions to list when/if a course is
	  in session or upcoming.
	: General Bug Fixes
	: Bootstrap Library support included
**/
"use strict";
// Set to 'true' to output debug console.log messages
var $debug_ON = true;

// Our communications port
var port = chrome.extension.connect({name: "...CourseraBrowse ver: 0.2.2..."});

// A globals array of objects to store our retrieved DOMAIN values
var domains = [];	// Previously was CATEGORIES
// A global array of objects to store our retrieved domainTypes values
var domainTypes = {
	'domains' : []
};

// Course API course tracking variables
var coursesTotal = 0;	// Total # of Coursera Courses
// Global variables to Domain dataset variables to aid in pagination, since server-side pagination is limited
var courses_artsandhumanities, courses_business, courses_computerscience, courses_datascience
var courses_lifesciences, courses_mathandlogic, courses_personaldevelopment
var courses_physicalscienceandengineering, courses_socialsciences, courses_languagelearning

//Pagination specific
var browse_domain_limit  = 10;	// Set default limit of 10 courses in browse
var current_browse_pages = 0;
var current_browse_page = 0;
var pagination_state = {
	'next_link': []
};

// Used to save our state and scroll position
var browse_state = [];
// Listener links
var link_listeners = {
	'links_ids' : [],
	'location' : ""
};

// Main API view implementation
var courseraBrowse = {
	
	getPartnerDetails: function(partner_ids, callback, update_html){
		$debug_ON && console.log(partner_ids);
		$debug_ON && console.log("Getting Partner(s) details!");
		
		// case we got here through a click
		event.preventDefault();
		
		var formatted_ids;
		
		$debug_ON && console.log("Array length is: " + partner_ids.length);
		for (var i = 0; i < partner_ids.length; i++){
			if (i == 0)
				formatted_ids = partner_ids[0];
			else
				formatted_ids += ',' + partner_ids[i];
		}
		
		$debug_ON && console.log("Formatted partner Ids: " + partner_ids);
		
		//Ajax request
		var xhr = new XMLHttpRequest();
		var partnerURL = 'https://api.coursera.org/api/catalog.v1/universities?ids=' + formatted_ids + '&includes=courses,instructors&fields=\
		name,description,banner,homeLink,location,classLogo,website,logo,squareLogo';
		//TODO: Need to adjust to new api specs in future !important @nathandh - 02/10/2016 
		
		$debug_ON && console.log(partnerURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}
		
		xhr.open("GET", partnerURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var partner_json = xhr.response;
			$debug_ON && console.log(partner_json);
		}
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);			
	},
	
	getInstructorDetails: function(instructor_ids, callback, update_html){
		$debug_ON && console.log(instructor_ids);
		$debug_ON && console.log("Getting Instructor(s) details!");
		
		// In case we got here through a click
		event.preventDefault();
		
		var formatted_ids;
		
		$debug_ON && console.log("Array length is: " + instructor_ids.length);
		for (var i = 0; i < instructor_ids.length; i++){
			if (i == 0)
				formatted_ids = instructor_ids[0];
			else
				formatted_ids += ',' + instructor_ids[i];
		}
		
		$debug_ON && console.log("Formatted instructor Ids: " + formatted_ids);
		
		//AJAX request
		var xhr = new XMLHttpRequest();
		var instructorURL = 'https://api.coursera.org/api/instructors.v1?ids=' + formatted_ids + '&includes=universities,courses,sessions&\
		fields=photo,bio,fullName,firstName,middleName,lastName,title,department,website';
		// *note: photo150 removed as does not return from latest API
		
		$debug_ON && console.log(instructorURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}		
		}
		
		xhr.open("GET", instructorURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var instructor_json = xhr.response;
			$debug_ON && console.log(instructor_json);
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);		
	},
	
	getSessionDetails: function(course_slug, callback, update_html){
		$debug_ON && console.log(course_slug);
		$debug_ON && console.log("Getting Course Session details!");
		
		// Incase we got here through a click
		event.preventDefault();
		
		/** Deprecated for now
		var formatted_ids;
		
		$debug_ON && console.log("Array length is: " + session_ids.length);
		for (var i = 0; i < session_ids.length; i++){
			if (i === 0)
				formatted_ids = session_ids[0];
			else {
				formatted_ids += ',' + session_ids[i];
			}
		}
		
		$debug_ON && console.log("Formatted session Ids: " + formatted_ids);
		**/
		
		$debug_ON && console.log("Course slug received is: " + course_slug);
		
		//AJAX request
		var xhr = new XMLHttpRequest();
		var sessionURL = 'https://www.coursera.org/api/onDemandCourses.v1?q=slug&slug=' + course_slug + '&includes=instructorIds,partnerIds,_links\
		&fields=partners.v1(squareLogo,rectangularLogo),instructors.v1(fullName),overridePartnerLogos,sessionsEnabledAt,domainTypes';
		/** Deprecated endoint
		var sessionURL = 'https://api.coursera.org/api/catalog.v1/sessions?ids=' + formatted_ids + '&includes=courses,instructors&fields=courseId,\
		status,active,startMonth,startDay,startYear,durationString';
		**/
		
		$debug_ON && console.log(sessionURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				} 
				if (xhr.status == 404){	//404 Not Found
					$debug_ON && console.log("...in 404 NOT found");
					/** Not all Coursera courses cannot be looked up by SLUG id at this point. 
						So getting any session data will fail automatically.
						We should therefore, construct some standard data just to populate our page,
						to maintain the user experience.
					**/
					var standard_response = {
						"elements":[{
							courseStatus: "Unknown",
							launchedAt: "N/A",
							urlBase: "https://www.coursera.org/course/"
						}]					
					};
					callback.apply(standard_response);
				}
				if (xhr.status == 403){	//403 User not enrollable in course?
					$debug_ON && console.log("...in 403 Forbidden");
					/** Some Coursera Coursera give a 403 error when looked up by SLUG id at this point. 
						So getting any session data will fail automatically.
						We should therefore, construct some standard data just to populate our page,
						to maintain the user experience.
					**/
					var standard_response = {
						"elements":[{
							courseStatus: "Unknown",
							launchedAt: "N/A",
							urlBase: "https://www.coursera.org/course/"
						}]					
					};
					callback.apply(standard_response);
				}
			}
		}
		
		xhr.open("GET", sessionURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var session_json = xhr.response;
			$debug_ON && console.log(session_json);
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);	
	},

	getCourseDetails: function(course_ids, callback, update_html) {
		$debug_ON && console.log(course_ids);
		$debug_ON && console.log("Getting Course details!");
		
		// In case we got here through a click
		event.preventDefault();	
			
		var formatted_ids; 
			
		$debug_ON && console.log("Array length is: " + course_ids.length);	
		for (var i = 0; i < course_ids.length; i++){
			$debug_ON && console.log("In formatting loop....");
			if (i === 0)
				formatted_ids = course_ids[i];
			else{
				formatted_ids += ',' + course_ids[i];
			}
		}
		
		$debug_ON && console.log("Formatted Ids: " + formatted_ids);
		
		var xhr = new XMLHttpRequest();
		var courseURL = 'https://api.coursera.org/api/courses.v1?ids=' + formatted_ids + '\
		&includes=instructorIds,partnerIds,_links&fields=instructorIds,partnerIds,\
		partners.v1(squareLogo,rectangularLogo,classLogo,logo,shortName),\
		instructors.v1(firstName, middleName, lastName),\
		description,photoUrl,courseStatus,primaryLanguages,subtitleLanguages,\
		slug,workload,domainTypes';
			
		/** Fields we want the most :
		name,description,slug,photoUrl,courseStatus,partnerIds,instructorIds
		**/
			
		$debug_ON && console.log(courseURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ // request is done
				if (xhr.status == 200){ // successfully
					callback.apply(xhr.response);
				}
			}
		}		
		
		xhr.open("GET", courseURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var course_json = xhr.response;
			$debug_ON && console.log(course_json);

			// Generate our SINGLE course detailed page
			if (update_html == true){
				$debug_ON && console.log("Updating HTML in getCourseDetails()");
				
				// Place a navigation button to get back to ALL courses in a domain listing
				$('#courseraDiv').html('<a id="btn_AllDomains" href="" class="button"><--All Domains</a>');
				var btn_all_domains = document.getElementById("btn_AllDomains");
				btn_all_domains.addEventListener("click", function(){
					event.preventDefault();
					courseraBrowse.getAllDomains(
						function(){
							$debug_ON && console.log("Got allDomains");
						}
					);					
				}, false);
				$('#courseraDiv').append('<br />...also found in: <br />');
				
				// Zero out our link_listeners.links_ids array
				link_listeners.links_ids = [];
				
				// Place DOMAIN found navigation at top
				for(var domain in course_json.elements[0].domainTypes){
					// This is deliberately a closure in order to get correct values in our addEventListener
					// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures			
					(function () {	
					$debug_ON && console.log("Linked domain: " + course_json.elements[0].domainTypes[domain].domainId);
					var linked_domain_id = course_json.elements[0].domainTypes[domain].domainId;
					var linked_domain_name = course_json.elements[0].domainTypes[domain].domainId;
					// Append our DIV to create navigation based on Domains
					$('#courseraDiv').append('| <a class="button" id="btn_domain_' + linked_domain_id + '" href=""> ' + linked_domain_name + '</a> ');
					// Add our listeners
					var link = document.getElementById('btn_domain_' + linked_domain_id);
					// Add our links to our tracking array
						link_listeners.links_ids.push({_link:'btn_domain_'+linked_domain_id,_current_id:linked_domain_id});
						link.addEventListener("click", function(){
							courseraBrowse.getDomainCourses(
								linked_domain_id,
								function(){
									$debug_ON && console.log("...beginning...single DomainCourses XHR Request");
									// we will do nothing else here, since we are updating HTML 
									// in the 'onload' of our ajax request, as indicated by TRUE as follows 
								}, true);
						}, false);
					}())
				}
				
				// Some variables to make our output to HTML easier
				var description = course_json.elements[0].description;	
				var course_status = course_json.elements[0].courseStatus.charAt(0).toUpperCase() + course_json.elements[0].courseStatus.slice(1);
				var about_course = course_status;		//@nathandh add more here later, to About Course
				
				$('#courseraDiv').append('<h3 id="subTitle">' + course_json.elements[0].name + ' :</h3>');	
				$('#courseraDiv').append('<p><table id="tbl_course_' + course_json.elements[0].id + '_details"><tr><td><!--<a id=course_' + course_json.elements[0].id + ' href="">-->\
				<img class="course_photo" src="' + course_json.elements[0].photoUrl + '" alt="Course Photo"/><br/>\
				' + course_json.elements[0].name + '<br/><!--</a>--><hr /><td></tr><tr><td><table><tr><td><div id="course_' + course_json.elements[0].id + '_sessions"></div></td></tr></table></div><hr /></td></tr>\
				<tr><td><table><tr><td class="course_subhead">Description:<br /><br /></td></tr><tr><td class="course_description">' + description + '<br /><br /></td></tr></table></td></tr>\
				<tr><td><table><tr><td class="course_subhead">About the course:</td></tr><tr><td class="course_about">' + about_course + '</td></tr></table><hr />\
				<table><tr><td class="course_subhead">Instructors:</td></tr><tr><td id="instructors_info"></td></tr></table></td></tr></table><br /></p>');	
				
				// Get our INSTRUCTOR IDs associated with course
				var instructor_ids = [];
				for (var _instructor in course_json.linked["instructors.v1"]){
					// Deliberate closure
					(function(){
						var current_instructor = course_json.linked["instructors.v1"][_instructor];
						$debug_ON && console.log("Linked instructor: " + current_instructor.fullName);
						instructor_ids.push(current_instructor.id);
					}())
				}
				
				$debug_ON && console.log("Instructor IDs: " + instructor_ids);
				
				// Get Instructor Data with IDs
				courseraBrowse.getInstructorDetails(
					instructor_ids,
					function(){
						var instructor_json = this;
						$debug_ON && console.log("Instructor JSON received: " + JSON.stringify(instructor_json.elements));
						
						// Consruct our Instructor HTML
						var instructorHTML;
						for (var __instructor in instructor_json.elements){
							var this_instructor = instructor_json.elements[__instructor];
							if (__instructor == 0)
								instructorHTML = '<table><tr><td>';
								
							instructorHTML += '<table><tr><td class="td_instructor_photo"><img class="instructor_small_photo" src="' + this_instructor.photo + '" alt="Instructor Photo" /></td><td><table class="tbl_instructor_info"><tr><td class="instructor_name">\
											' + this_instructor.firstName + ' ' + this_instructor.lastName + '</td></tr><tr><td>' + this_instructor.title + '</td></tr><tr><td class="td_instructor_department">\
											' + this_instructor.department + '</td></tr></table></td></tr></table>';
																		 
							if (__instructor == instructor_json.elements.length)
								instructorHTML += '</td></tr></table>';
						}
						
						$debug_ON && console.log("InstructorHTML is: " + instructorHTML);
						// Append out instructor Info to our COURSE Page
						$('#instructors_info').append(instructorHTML);
						
						// Include out toTOP link on page for easier navigation		
						/*
						$('#courseraDiv').append('<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
						document.getElementById("toTopAnchor").click();
						
						// Save our state and zero scroll position
						browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
						$debug_ON && console.log("==> browse_state after 'getCourseDetails().getInstructorDetails()' call: " + browse_state[0].courseraDiv);
						
						// Sending updated state via messaging to background
						var _browse_state = JSON.stringify(browse_state[0]);
						port.postMessage({browseState:_browse_state});	*/					
					}, false);				
				
				/** Deprecated
				// Get our SESSION IDs associated with a course...
				var session_ids = [];
				for (var session in course_json.linked.sessions){
					// Deliberate closure
					(function(){
						current_session = course_json.linked.sessions[session];
						$debug_ON && console.log("Linked session: " + current_session.homeLink);
						session_ids.push(current_session.id);
					}())
				} **/
				
				// Get our SLUG associated with the course...
				var course_slug = course_json.elements[0].slug;
				
				$debug_ON && console.log("Course slug: " + course_slug);
				// Get Session Data based on SLUG
				courseraBrowse.getSessionDetails(
					course_slug,
					function(){
						var session_json = this;
						$debug_ON && console.log("Session JSON received: " + JSON.stringify(session_json));
						
						// Construct our Session HTML
						var sessionHTML;
						for (var _session in session_json.elements){
							//Deliberate closure
							(function(){
							var this_session = session_json.elements[_session];
							// Helper variables for HTML output
							var session_id = _session+1	//this_session.id;
							var session_start_date = getDateTime(this_session.launchedAt);
							if (typeof(this_session.launchedAt) == "undefined")
								session_start_date = "N/A";
							var session_duration = "Ongoing"
							//var session_home_link = '<a href="' + this_session.homeLink + '" target="_blank" title="Link: ' + this_session.homeLink + '">' + this_session.homeLink + '</a>';
							var session_home_link = '<a href="https://www.coursera.org/learn/' + course_slug + '" target="_blank" title="Link: https://www.coursera.org/learn/' + course_slug + '">https://www.coursera.org/learn/' + course_slug + '</a>';
							if (this_session.hasOwnProperty("urlBase")){
								// Then we had a 404, and need to adjust the Session Home Link Accordingly
								session_home_link = '<a href="https://www.coursera.org/course/' + course_slug + '" target="_blank" title="Link: https://www.coursera.org/course/' + course_slug + '">https://www.coursera.org/course/' + course_slug + '</a>';
							}
							
							var session_status;
							if (this_session.courseStatus == "launched")
								session_status = "Open";
							else if (this_session.courseStatus == "preenroll")
								session_status = "Coming Soon. Pre-Enroll.";
							else
								session_status = "Not currently offered.";
							
							if(_session == 0)
								sessionHTML = '<table><tr><td class="course_subhead">Sessions:<br/></td></tr></table>\
											<table class="status_state_duration"><tr><th>ID:</th><th>Status:</th><th>Start Date:</th><th>Duration:</th></tr>';
								
							sessionHTML += '<tr><td class="session_id">' + session_id + '</td><td class="session_status">' + session_status + '</td>\
											<td class="session_start_date">' + session_start_date + '</td><td class="session_duration">' + session_duration + '</td></tr>\
											<hr /></table><table class="course_home_link"><tr><td></td><td>' + session_home_link + '</td>\
											</tr></table><table class="status_state_duration">';
							
							if (_session == session_json.elements.length)
								sessionHTML += '</table>';								
							}())
						}
						var session_div = document.getElementById("course_" + course_json.elements[0].id + "_sessions");
						$(session_div).append(sessionHTML);
						$('#courseraDiv').append('<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
						// Make sure we are at top of page
						document.getElementById("toTopAnchor").click();

						// Save our state and zero scroll position
						browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
						$debug_ON && console.log("==> browse_state after 'getCourseDetails()' call: " + browse_state[0].courseraDiv);
						
						// Sending updated state via messaging to background
						var _browse_state = JSON.stringify(browse_state[0]);
						port.postMessage({browseState:_browse_state});	

						link_listeners.location = "getCategoryCourses";
						// Test send our links
						$debug_ON && console.log("LINK Listeners" + link_listeners);
						var _link_listeners = JSON.stringify(link_listeners);
						port.postMessage({linkListeners:_link_listeners});
					}, false);
			}
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);	
	},
	
	outputCourses: function(start, stop, num_pages, my_domain_courses, partner_ids, partner_course, link_listeners, callback){
		$debug_ON && console.log("START: " + start);
		$debug_ON && console.log("STOP: " + stop);
		$debug_ON && console.log("# of pages: " + num_pages);
		$debug_ON && console.log(my_domain_courses);
		$debug_ON && console.log(partner_ids);
		$debug_ON && console.log(partner_course);
		$debug_ON && console.log(link_listeners);
		
		// Set to globals
		current_browse_pages = num_pages;
		current_browse_page = Math.floor(Math.round((stop / browse_domain_limit) + ((browse_domain_limit / 2) - 1)/10));
		$debug_ON && console.log(current_browse_page);
		
		var curr_courses_length;
		
		for (var i = start; i < stop; i++){	//Previously set to iterate domain_courses.length
			// This is deliberately a closure in order to get correct values in our addEventListener
			// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures			
			(function () {		
				curr_courses_length = my_domain_courses.length;
				$debug_ON && console.log("My_Domain_Courses length: " + my_domain_courses.length);
				$debug_ON && console.log('Current COURSE is: ' + my_domain_courses[i].name);
				$debug_ON && console.log(JSON.stringify(my_domain_courses[i]));
				
				// Output our domain courses to the popup
				$('#courseraDiv').append('<p><table id=tbl_course_' + my_domain_courses[i].id + '><tr><td><a id=course_' + my_domain_courses[i].id + ' href="">\
				<img class="course_photo" src="' + my_domain_courses[i].photoUrl + '" alt="Course Photo"/><br/>\
				' + my_domain_courses[i].name + '<br/></a></td></tr><tr><td id="partner_' + my_domain_courses[i].partnerIds[0] + '_' + my_domain_courses[i].id + '"></td></tr></table><br /></p>');
				
				// Store our course PRIMARY PartnerID so we can update the page
				partner_ids.push(my_domain_courses[i].partnerIds[0]);
				// Add key,value pair top our Partner/Course object
				partner_course.push({course_id:my_domain_courses[i].id,partner_id:my_domain_courses[i].partnerIds[0]});
												
				// Create new listener for onclick event of each anchor tag
				var current_course_id = my_domain_courses[i].id;
				$debug_ON && console.log("Current COURSE ID is: " + current_course_id);
				var link = document.getElementById('course_' + current_course_id);
				var array_ccid = [current_course_id]; // since our getCourseDetails function relies on an array as an argument
				// Add our links to our tracking array
				link_listeners.links_ids.push({_link:'course_'+current_course_id,_current_id:current_course_id});								
				link.addEventListener("click", function(){
					courseraBrowse.getCourseDetails(
						array_ccid,
						function(){
							$debug_ON && console.log("...beginning...single CourseDetails XHR Request");
							// we will do nothing else here, since we are updating HTML 
							// in the 'onload' of our ajax request, as indicated by TRUE as follows 
						}, true);
				}, false);							
			}())
		}
		link_listeners.location = "getCourseDetails";
		
		// Delete our browse_domain_limit (default 10) of courses link if it already exists
		$('#course_next10').remove();
		$('#toTopAnchor').remove();
		$('#pagination').remove();
		// Append our domain_browse_nav DIV
		$('#domain_browse_nav').remove();
		$('#courseraDiv').append('<div id="domain_browse_nav"></div>');
		$('#domain_browse_nav').append('<div id="pagination"><p>Current Page: ' + current_browse_page + 
									'</br><p>Pages remaining: '+(current_browse_pages-current_browse_page)+'</p></p></div>');
		
		var next10_link; 	// Our NEXT link in pagination
		var new_stop = 0;
		if ((stop + browse_domain_limit) > curr_courses_length){
			new_stop = curr_courses_length;
		} else {
			// Set our new STOP
			new_stop = stop + browse_domain_limit;
		}	
		
		if (!(new_stop == stop)){	// Then we should have a NEXT10 link
			// Append next 10 courses link
			$('#domain_browse_nav').append('<div id="next10"><a id=course_next10 href="">Next10</a></div>');
			next10_link = document.getElementById('course_next10');
			next10_link.addEventListener("click", function(){
				courseraBrowse.outputCourses(
					start+browse_domain_limit,
					new_stop,
					current_browse_pages,
					my_domain_courses,
					[], 
					[], 
					link_listeners, 
					function(){
						$debug_ON && console.log("...Outputting next 10 courses...");
					});
			}, false);
			pagination_state.next_link[0] ={"start":start+browse_domain_limit,"stop":new_stop,"num_pages":current_browse_pages,"domain_courses":my_domain_courses, "partner_ids":[], "partner_course":[],"link_listeners": link_listeners, "callback": []};
			// Send our pagination state to background
			var _pagination_state = JSON.stringify(pagination_state);
			$debug_ON && console.log("Pagination State is: " + _pagination_state);
			port.postMessage({paginationState:_pagination_state});
			
			// Save our state and zero scroll position
			browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
			$debug_ON && console.log("==> browse_state after 'getDomainCourses() next10 Pagination' call: " + browse_state[0].courseraDiv);
			
			// Sending updated state via messaging to background
			var _browse_state = JSON.stringify(browse_state[0]);
			port.postMessage({browseState:_browse_state});	
			
			// Test send our links
			$debug_ON && console.log("LINK Listeners" + link_listeners);
			var _link_listeners = JSON.stringify(link_listeners);
			port.postMessage({linkListeners:_link_listeners});	
		}
		
		$('#domain_browse_nav').append('<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
		if (start == 0){
			document.getElementById("toTopAnchor").click();
		}
		
		$debug_ON && console.log(partner_course);
		// Get and append our Partner Names to the page
		courseraBrowse.getPartnerDetails(
			partner_ids,
			function(){
				$debug_ON && console.log("...beginning...Partner lookup in getDomainCourses()");
				var partner_json = this;
				
				for(var partner in partner_json.elements){
					var current_partner = partner_json.elements[partner];
					// Append our HTML with some Partner information
					// for each course in the Domain
					var partner_html = '<table><tr><td class="domaincourse_partner_name">' + current_partner.name + '</td></tr><tr><td class="domaincourse_partner_loc">' + current_partner.location + '</td></tr></table>';
					$debug_ON && console.log(partner_html);
					for(var _partner_course in partner_course){
						var curr_partner_course = partner_course[_partner_course];
						if(curr_partner_course.partner_id == current_partner.id){
							// Append our Partner information
							$('#partner_' + current_partner.id + '_' + curr_partner_course.course_id).append(partner_html);
						}
					}
				}
				
				// Save our state and zero scroll position
				browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
				$debug_ON && console.log("==> browse_state after 1st 'outputCourses()' call: " + browse_state[0].courseraDiv);
				
				// Sending updated state via messaging to background
				var _browse_state = JSON.stringify(browse_state[0]);
				port.postMessage({browseState:_browse_state});	
				
				// Test send our links
				$debug_ON && console.log("LINK Listeners" + link_listeners);
				var _link_listeners = JSON.stringify(link_listeners);
				port.postMessage({linkListeners:_link_listeners});
			}, false);		
		callback(0);
	},
	
	getDomainCourses: function(domain_id, callback, update_html) {
		var browse_domain, browse_domain_id;
		
		// First let's get our domain name given the passed ID
		for (var domain in domains){
			if (domains[domain].id == domain_id){
				$debug_ON && console.log("FOUND");
				browse_domain = domains[domain].name;
				browse_domain_id = domains[domain].id;
				break;
			}
			else
				$debug_ON && console.log("...still LOOKING...");
		}
		 
		coursesTotal = 0;	// Reset Courses Total
		var domain_courses_total = 0;	// Total # of Coursera Courses in browseable Domain
		var browse_domain_current_page = 0;	// Current page in browse_domain pagination
		var browse_domain_pages = 0;		// Total # of pages needed to request from API, based on domain_courses_total
	
		// Prevent the default link click action so we can complete our request
		event.preventDefault();
		
		//alert("I'm getting all domains with: " + domain_id);
		var xhr = new XMLHttpRequest();
		var domainCoursesURL = 'https://www.coursera.org/api/catalogResults.v2?q=subdomainByDomain&languages=en&domainId=' + domain_id + '&debug=\
		false&fields=debug,courseId,domainId,onDemandSpecializationId,specializationId,subdomainId,domains.v1(id,description,keywords,name,\
		subdomainIds,backgroundImageUrl),subdomains.v1(id,name),courses.v1(name,description,slug,photoUrl,courseStatus,partnerIds),\
		onDemandSpecializations.v1(name,description,slug,logo,courseIds,launchedAt,partnerIds),specializations.v1(name,description,shortName,\
		logo,primaryCourseIds,display,partnerIds),partners.v1(name)&includes=courseId,domainId,onDemandSpecializationId,specializationId,\
		subdomainId,courses.v1(partnerIds),onDemandSpecializations.v1(partnerIds),specializations.v1(partnerIds)';
		
		// array to hold and sort out courses
		var courses = [];
		
		$debug_ON && console.log(domainCoursesURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ // request is done
				if (xhr.status == 200){ // successfully
					callback.apply(xhr.response);
				}
			}
		}		
		
		xhr.open("GET", domainCoursesURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var domains_courses_json = xhr.response;
			$debug_ON && console.log(domains_courses_json);
			
			domain_courses_total = domains_courses_json.linked["courses.v1"].length;
			browse_domain_current_page += 1;	//Increment Current page count
			if (browse_domain_current_page == 1){
				browse_domain_pages = Math.round((domain_courses_total + (browse_domain_limit / 2) - 1) / browse_domain_limit);
			}
			
			// Debugging output
			$debug_ON && console.log("####################################");
			$debug_ON && console.log("Courses Total is: " + coursesTotal);
			$debug_ON && console.log("Domain Courses Total is: " + domain_courses_total);
			$debug_ON && console.log("Pages (of 10) needed to get all courses is: " + browse_domain_pages);
			$debug_ON && console.log("####################################");
			
			// We generate and output our HTML for Domain Courses
			if (update_html == true){
				$debug_ON && console.log("Updating HTML in getDomainCourses()");
				
				//$('#courseraDiv').hide();
				// couse_ids is used so we can grab extra data for each course
				var course_ids = [] 
				for (var course in domains_courses_json.linked["courses.v1"]){
					var current_course = domains_courses_json.linked["courses.v1"][course];
					var courseStatus, courseType, description, id, name, partnerIds, photoUrl, slug;
					for (var key in current_course){
						if (current_course.hasOwnProperty(key)){
							//$debug_ON && console.log("Key is: " + key);
							if (key == "courseStatus")
								courseStatus = current_course[key];
							else if (key == "courseType")
								courseType = current_course[key];
							else if (key == "description")
								description = current_course[key];
							else if (key == "id"){
								id = current_course[key];
								course_ids.push(id);	// Perhaps look into easier way of doing this - @nathandh 2/9/2016
							}
							else if (key == "name")
								name = current_course[key];
							else if (key == "partnerIds")
								partnerIds = current_course[key];
							else if (key == "photoUrl")
								photoUrl = current_course[key];
							else if (key == "slug")
								slug = current_course[key];
						}
					}
					courses.push({
						"courseStatus":courseStatus,
						"courseType":courseType,
						"description":description,
						"id":id,
						"name":name,
						"partnerIds":partnerIds,
						"photoUrl":photoUrl,
						"slug":slug,
						sortable: true,
						resizable: true
					});	
				}
				
				// Removed the following as it seems unnecessary to grab course details at this point.
				// Grab more course details for our 1st courses (base on browse_limit, default is 10)
				/*
				var initial_course_ids = 0;
				for (i = 0; i < browse_domain_limit; i++){
					try{
						initial_course_ids.push(course_ids[i]);
					} catch (e){
						$debug_ON && console.log("Error: " + e);
					}
				}
				*/
				/*courseraBrowse.getCourseDetails(
					initial_course_ids,
					function(){
						// 'this' is set in the called funtion xhr above, 
						// it is the responce of the callback
						$debug_ON && console.log(this);
						var courses_json = this;

						var linked_instructors = courses_json.linked["instructors.v1"];
						var linked_partners = courses_json.linked["partners.v1"];
						for (var course in courses_json.elements){
							var current_course = courses_json.elements[course];
							for (var _course in courses){
								var _current_course = courses[_course];
								if (current_course.id == _current_course.id){
									$debug_ON && console.log(current_course.id  + "/" + _current_course.id);
									$debug_ON && console.log("We have matched our course!");
									// Update courses with extra course data
									var partners_squareLogo, partners_rectangularLogo, partners_classLogo, partners_logo, partners_shortName;
									var instructorIds 
									var primaryLanguages, subtitleLanguages, workload;
									// ^End of extra course data variables
									var linked = {
										"instructors.v1": []
									};
									for (var key in current_course){
										if (current_course.hasOwnProperty(key)){
											$debug_ON && console.log("Key is: " + key);
											if (key == "instructorIds"){
												instructorIds = current_course[key];
												$debug_ON && console.log("Course: " + courses[_course].name);
												courses[_course].instructorIds = instructorIds;
											} else if (key == "primaryLanguages"){
												primaryLanguages = current_course[key];
												courses[_course].primaryLanguages = primaryLanguages;
											} else if (key == "subtitleLanguages"){
												subtitleLanguages = current_course[key];
												courses[_course].subtitleLanguages = subtitleLanguages;
											} else if (key == "workload"){
												workload = current_course[key];
												courses[_course].workload = workload;
											}
										}
									}
									
									courses[_course].linked = linked;
									// Add our partner Fields information
									for (var index in linked_instructors){
										var instructor = linked_instructors[index];
										$debug_ON && console.log("Examining Instructor:" + JSON.stringify(instructor));
										for (var key in instructor){
											if (instructor.hasOwnProperty(key)){
												$debug_ON && console.log("Instructor Key is: " + key);
												if (key == "id"){
													// Check association with current Instructor IDs in course
													for (instructor_idx in courses[_course].instructorIds){
														var course_instructor = courses[_course].instructorIds[instructor_idx];
														$debug_ON && console.log("Comparing course instructor ID of: " + course_instructor);
														$debug_ON && console.log("Compared to: " + instructor[key] + "\n\n");
														if (course_instructor === instructor[key]){
															$debug_ON && console.log("INSTRUCTOR Match found!")
															courses[_course].linked["instructors.v1"].push(instructor);
															$debug_ON && console.log("Course instructors updated to: " + JSON.stringify(courses[_course].linked["instructors.v1"]));
														}
													}
												}
											}
										}
									}
								}
							}
						}
											
										
					}, false);	*/
					
					
				/**
				Finish processing our data and output to the page
				**/
				// Sort our courses
				courses.sort(function (a, b){
					var course1 = a.name.toLowerCase(), course2 = b.name.toLowerCase();				
					if (course1 < course2)
						return -1;
					if (course1 > course2)
						return 1;
					return 0;
				});	
				
				// Set courses to gobal courses domain array
				var _browse_domain_id = browse_domain_id.replace(/-/g,"");	// Strip hyphens from domain_id if they exist
				window['courses_' + _browse_domain_id] = courses;
				var domain_courses = window['courses_' + _browse_domain_id];
				$debug_ON && console.log("Setting courses to global domain course variable: " + 'courses_'+_browse_domain_id);
				
				// Place a navigation button to get back to ALL domains screen
				$('#courseraDiv').html('<a id="btn_AllDomains" href="" class="button"><--All Domains</a>');
				var btn_all_domains = document.getElementById("btn_AllDomains");
				btn_all_domains.addEventListener("click", function(){
					event.preventDefault();
					courseraBrowse.getAllDomains(
						function(){
							$debug_ON && console.log("Got allDomains");
						}
					);							
				}, false);
			
				$('#courseraDiv').append('<h3 class="subTitle">' + browse_domain + ' Courses:</h3>');
				
				//Partner Institution IDs array to get college names
				var partner_ids = [];
				
				// Partner/Course array of objects
				var partner_course = [];
				
				// Zero out our link_listeners.links_ids array
				link_listeners.links_ids = [];
				
				// Output 1st set of records to page
				courseraBrowse.outputCourses((browse_domain_current_page * browse_domain_limit) - browse_domain_limit, 	//Start
											browse_domain_limit, browse_domain_pages, window['courses_' + _browse_domain_id], 
											partner_ids,partner_course, link_listeners,
											function(){
												$debug_ON && console.log("...Outputting 1st 10 courses...");
											}); 
				
				// Save our state and zero scroll position
				browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
				$debug_ON && console.log("==> browse_state after 'getDomainCourses()' call: " + browse_state[0].courseraDiv);
				
				// Sending updated state via messaging to background
				var _browse_state = JSON.stringify(browse_state[0]);
				port.postMessage({browseState:_browse_state});	
				
				// Test send our links
				$debug_ON && console.log("LINK Listeners" + link_listeners);
				var _link_listeners = JSON.stringify(link_listeners);
				port.postMessage({linkListeners:_link_listeners});					
			}
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);		
	},

	getAllDomains: function(callback) {
		/*
		$debug_ON && console.log("...TESTING: getting allCourses 1st");
		courseraBrowse.getAllCourses(
			function(){
				$debug_ON && console.log("Got allCourses");
			}, 0	// 0 indicates start at 1st course in API
		);
		
		URL for DOMAINS : https://www.coursera.org/api/domains.v1
		*/
		
	
		$debug_ON && console.log("...inside getAllDomains!");
				
		var xhr = new XMLHttpRequest();
		var allDomainsURL = "https://www.coursera.org/api/domains.v1?&fields=backgroundImageUrl";
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}		
	
		xhr.open("GET", allDomainsURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function(e){
			var domains_json = xhr.response;
			
			$debug_ON && console.log(domains_json);
			
			$('#courseraDiv').html("");
			//$('#courseraDiv').hide();
			
			// Zero our our previous domains
			domains = [];
			
			for(var domain in domains_json.elements){
				var current_domain = domains_json.elements[domain];
				var id, name, subdomainIds, backgroundImageUrl, keywords, description;
				for (var key in current_domain){
					if (current_domain.hasOwnProperty(key)){
						if (key == "id")
							id = current_domain[key];
						else if (key == "name")
							name = current_domain[key];
						else if (key == "subdomainIds")
							subdomainIds = current_domain[key];
						else if (key == "backgroundImageUrl")
							backgroundImageUrl = current_domain[key];
						else if (key == "keywords")
							keywords = current_domain[key];
						else if (key == "description")
							description = current_domain[key];
					}	
				}
				domains.push({
					"id":id,
					"name":name,
					"subdomainIds":subdomainIds,
					"backgroundImageUrl":backgroundImageUrl,
					"keywords":keywords,
					"description":description,
					sortable: true,
					resizeable: true
				});
				//$('#courseraDiv').append('<p>Domain: ' + name + '<br /></p>'
				//);
			}
			
			// Sort by Domain NAME ascending
			domains.sort(function(a, b){
				var dom1 = a.name.toLowerCase(), dom2 = b.name.toLowerCase();
				if (dom1 < dom2) // sort ascending
					return -1;
				if (dom1 > dom2)
					return 1;
				return 0;		// default, no sorting
			});
			
			// Zero out our link_listeners.links_ids array
			link_listeners.links_ids = [];
		
			for (var i = 0; i < domains.length; i++){
				// This is deliberately a closure in order to get correct values in our addEventListener
				// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
				(function () {
					$debug_ON && console.log('Current DOMAIN is: ' + domains[i].name);
					
					// Creative Commons images for our Domains
					var img_src;
					if (domains[i].id == "arts-and-humanities")
						img_src = "img/domains/arts-and-humanities_domain.png";
					else if (domains[i].id == "business")
						img_src = "img/domains/business_domain.png";
					else if (domains[i].id == "computer-science")
						img_src = "img/domains/computer-science_domain.png";
					else if (domains[i].id == "data-science")
						img_src = "img/domains/data-science_domain.png";
					else if (domains[i].id == "life-sciences")
						img_src = "img/domains/life-sciences_domain.png";
					else if (domains[i].id == "math-and-logic")
						img_src = "img/domains/math-and-logic_domain.png";
					else if (domains[i].id == "personal-development")
						img_src = "img/domains/personal-development_domain.png";	
					else if (domains[i].id == "physical-science-and-engineering")
						img_src = "img/domains/physical-science-and-engineering_domain.png";	
					else if (domains[i].id == "social-sciences")
						img_src = "img/domains/social-sciences_domain.png";		
					else if (domains[i].id == "language-learning")
						img_src = "img/domains/language-learning_domain.png";					
					else 
						img_src = "img/domains/coursera-logo-nobg-blue_48.png";
					
					// Output our domains to the popup
					$('#courseraDiv').append('<p><table id=tbl_domain_' + domains[i].id + '><tr><td><a class="domainAnchor" id=domain_' + domains[i].id + ' href="">\
					<img src="' + img_src + '" alt="Coursera Logo"/><br/><div class="domainName">\
					' + domains[i].name + '</div><div class="domainNumCourses" id="domain_' + domains[i].id + '_numCourses"></div></a><td></tr></table></p>');
					
					// Determine how many courses are in each DOMAIN, and append our DIV
					var _num_domain_id = domains[i].id;
					courseraBrowse.getDomainCourses(
						domains[i].id,
						function(){
							// Handle our callback here
							var _courses_json = this;
							var domain_num_courses = _courses_json.linked["courses.v1"].length;
							// Update coursesTotal
							coursesTotal += domain_num_courses;
							$debug_ON && console.log("Courses length: " + domain_num_courses);
							$('#domain_' + _num_domain_id + '_numCourses').append('<strong>' + domain_num_courses + '</strong> total courses');
						
							// Save our browse state and zero scroll position
							browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
							$debug_ON && console.log("==> browse_state after 'getAllDomains()' call: " + browse_state[0].courseraDiv);
							
							// Sending updated state via messaging to background
							var _browse_state = JSON.stringify(browse_state[0]);
							port.postMessage({browseState:_browse_state});
						}, false);
					
					// Create new listener for onclick event of anchor tag
					var current_id = domains[i].id;
					$debug_ON && console.log("Current ID is: " + current_id);
					var link = document.getElementById('domain_' + current_id);
					// Add our links to our tracking array
					link_listeners.links_ids.push({_link:'domain_'+current_id,_current_id:current_id}); 
					link.addEventListener("click", function(){
						courseraBrowse.getDomainCourses(
							current_id,
							function(){
								$debug_ON && console.log("...beginning...single DomainCourses XHR Request");
								// we will do nothing else here, since we are updating HTML 
								// in the 'onload' of our ajax request, as indicated by TRUE as follows 
							}, true);
					}, false);
				}())
			}
			
			$('#courseraDiv').append('<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
			$('#courseraDiv').show();
			
			// Make sure we are at top of page
			document.getElementById("toTopAnchor").click();
			
			// Save and Send our updated Domains via messaging to background
			var _last_domains = JSON.stringify(domains);
			port.postMessage({lastDomains:_last_domains});			
						
			// Save our browse state and zero scroll position
			browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
			$debug_ON && console.log("==> browse_state after 'getAllDomains()' call: " + browse_state[0].courseraDiv);
			
			// Sending updated state via messaging to background
			var _browse_state = JSON.stringify(browse_state[0]);
			port.postMessage({browseState:_browse_state});
			
			link_listeners.location = "getDomainCourses";
			// Test send our links
			$debug_ON && console.log("LINK Listeners" + link_listeners);
			var _link_listeners = JSON.stringify(link_listeners);
			port.postMessage({linkListeners:_link_listeners});
		};
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);
	},
	
	updateLinkListeners: function (links, callback){
		$debug_ON && console.log("...Updating link listeners on page....");
		$debug_ON && console.log(links[0].location);
		console.log(links);
		// First ATTEMPT to restore our ALL Domains link to get back to the main domain page:
		// this will fail on MAIN page since we don't have our btn_AllDomains yet on the page
		try {
			(function (){
				var btn_all_domains = document.getElementById("btn_AllDomains");
				$debug_ON && console.log("Button element is: " + btn_all_domains);
				btn_all_domains.addEventListener("click", function(){
					event.preventDefault();
					courseraBrowse.getAllDomains(
						function(){
							$debug_ON && console.log("Got allDomains");
						}
					);
				}, false);	
			}())
		} catch (e){
			$debug_ON && console.log("Error: " + e);
		}
				
		// Restore remaining links on the page
		var location = links[0].location;
		for (var link_obj in links[0].links_ids){
			// Deliberate closure
			(function (){
				var current_link = document.getElementById(links[0].links_ids[link_obj]._link);
				var current_id = links[0].links_ids[link_obj]._current_id;
				$debug_ON && console.log("Activating link: " + links[0].links_ids[link_obj]._link + " with current_id of: " + current_id);
				if (location == "getDomainCourses"){
					current_link.addEventListener("click", function(){
						courseraBrowse.getDomainCourses(
							current_id,
							function(){
								$debug_ON && console.log("...beginning...single DomainCourses XHR Request");
								// we will do nothing else here, since we are updating HTML 
								// in the 'onload' of our ajax request, as indicated by TRUE as follows 
							}, true);
						}, false);	
				} else if (location == "getCourseDetails"){
					var array_ccid = [current_id]; 	// since getCourseDetails expects array of cours id's
					current_link.addEventListener("click", function(){
						courseraBrowse.getCourseDetails(
							array_ccid,
							function(){
								$debug_ON && console.log("...beginning...single CourseDetails XHR Request");
								// we will do nothing else here, since we are updating HTML 
								// in the 'onload' of our ajax request, as indicated by TRUE as follows 
							}, true);	
						}, false);					
				}			
			}())
		}
		callback(0);
	},
	
	updatePaginationState: function (state, callback){
		$debug_ON && console.log("...in updatePaginationState...");
		//$debug_ON && console.log("state is: " + JSON.stringify(state));
		$debug_ON && console.log("Start is: " + state.next_link[0].next_link[0].start);	// Perhaps clean formatting of object later, but we have data for now!
		
		try {
			// Activate Next10 Link to default for pagination
			var next10_link = document.getElementById('course_next10');
			next10_link.addEventListener("click", function(){
				courseraBrowse.outputCourses(
					state.next_link[0].next_link[0].start,
					state.next_link[0].next_link[0].stop,
					state.next_link[0].next_link[0].num_pages,
					state.next_link[0].next_link[0].domain_courses,
					state.next_link[0].next_link[0].partner_course, 
					state.next_link[0].next_link[0].partner_ids, 
					state.next_link[0].next_link[0].link_listeners, 
					function(){
						$debug_ON && console.log("...Outputting next 10 courses...");
					});
			}, false);
		} catch (e){
			$debug_ON && console.log("Error: " + e);
		}
		
		callback(0);
	}
};

/** Helper functions *
	Currently ONLY getDateTime() is used in latest Iteration
	Keeping, for potential future use
	@nathadh 02.11.2016
**/
function getDateTime(timestamp){
	// Our return variable
	var formatted_date;
	
	if (timestamp === "N/A"){
		// Just return our timestamp AS-IS, since its just placeholder text
		formatted_date = timestamp; 
	} else {
		$debug_ON && console.log("getDateTime called...");
		var date = new Date(timestamp);	// to get milliseconds ouput
		// Get our Hours, Minutes, Seconds
		var hours = date.getUTCHours();
		var minutes = date.getUTCMinutes();
		var seconds = date.getUTCSeconds();
		
		// Get our Day, Month, Year
		var year = date.getUTCFullYear();
		var month = date.getUTCMonth();
		var day = date.getUTCDate();
		
		// Format our date
		formatted_date = month + '/' + day + '/' + year + '/' + ' ' + hours + ':' + minutes + ':' + seconds;
	}
	// Return our result
	return formatted_date;
}
function containsDomain(domain, list){
	$debug_ON && console.log("In function containsDomain " + JSON.stringify(list));
	try {
		for (var i = 0; i < list.length; i++){
			$debug_ON && console.log(list[i].domain_id);
			$debug_ON && console.log(domain);
			if (list[i].domain_id === domain){
				return true;
			}
		}
	} catch (e) {
		$debug_ON && console.log(e);
		return false;
	}
	// Return false by default
	return false;
};
function containsItem(item, list){
	$debug_ON && console.log("In funciton containsItem " + JSON.stringify(list));
	try {
		for (var i = 0; i < list.length; i++){
			if (list[i] === item){
				return true;
			}
		}
	} catch (e){
		$debug_ON && console.log(e);
		return false;
	}
	// Return false by default
	return false;
};

/**
Some app defined recognized message types to make
sending messages a bit easier in our program:
	1) notification
	2) request
	3) response
	4) acknowledge
	5) browseState
	6) browseStateUpdate
    7) linkStateUpdate
	8) lastDomainsUpdate
**/
port.onMessage.addListener(
	function(msg) {
		for(var key in msg){			
			$debug_ON && console.log("MSG $Key is: " + key); 
			$debug_ON && console.log("coursera_browse.js Received message: " + msg[key]);
			if (key == "notification"){
				// skip
			} else if (key == "request"){
				// skip
			} else if (key == "response"){
				if(msg[key] == "0_browse_state" || msg[key] == "0_last_domains"){
					// Load our default page of Coursera Domains
					courseraBrowse.getAllDomains(
						function(){
							$debug_ON && console.log("Got allDomains");
						}
					);					
				}
			} else if (key == "acknowledge"){
				// skip
			} else if (key == "browseStateUpdate"){
				port.postMessage({acknowledge:'browse_state update received'});
				$debug_ON && console.log("!~~~~coursera_browse.js has received browse_state message~~~~!");
				browse_state[0] = JSON.parse(msg[key]);
				$debug_ON && console.log("JSON parsed browse_state msg: " + browse_state[0].courseraDiv);
				
				// Set our HTML to the data sent
				$('#courseraDiv').html(browse_state[0].courseraDiv);
				$('#courseraDiv').show();
			} else if (key == "linkStateUpdate"){
				port.postMessage({acknowledge:'link_state update received'});
				$debug_ON && console.log("!~~~~coursera_browse.js has received link_state message~~~~!");
				link_listeners[0] = JSON.parse(msg[key]);
				$debug_ON && console.log("JSON parsed link_state msg 'location': " + link_listeners[0].location);
				
				// Update our listeners
				$debug_ON && console.log("...initiating Listener update!...");
				// Call our updateLinkListener function
				courseraBrowse.updateLinkListeners(link_listeners, function (response){
					if(response == 0){
						$debug_ON && console.log("Successfully updated LinkListeners!");
					} else {
						$debug_ON && console.log("ERROR updating LinkListeners!: " + response);
					}
				});
			} else if (key == "lastDomainsUpdate"){
				port.postMessage({acknowledge:'last_domains update received'});
				$debug_ON && console.log("!~~~~coursera_browse.js has received last_domains message~~~~!");
				// Update our domains
				$debug_ON && console.log("...initiating Domain update!...");				
				domains = JSON.parse(msg[key]);
				$debug_ON && console.log("JSON parsed last_domains msg: " + domains);
			} else if (key == "paginationStateUpdate"){
				port.postMessage({acknowledge:'pagination_state update received'});
				$debug_ON && console.log("!****coursera.browse.js has received pagination_state message****!");
				pagination_state.next_link[0] = JSON.parse(msg[key]);
				$debug_ON && console.log("JSON parsed pagination_state msg: " + pagination_state.next_link[0]);
				
				// Update our pagination state links
				$debug_ON && console.log("...initiating Pagination update!...");
				// Call our updatePaginationState function
				courseraBrowse.updatePaginationState(pagination_state, function (response){
					if(response == 0){
						$debug_ON && console.log("Successfully updated PaginationState!");
					} else {
						$debug_ON && console.log("ERROR updating PaginationState!: " + response);
					}
				});
			}			
		}
}); 

// Runs at popup.html load
document.addEventListener('DOMContentLoaded', function () {
	port.postMessage({response:"Hello: background.js!"});
	
	// Request our stored "last_domains" object, if it exists
	port.postMessage({request:"last_domains"});	
	// Request our stored "browse_state" object, if it exists
	port.postMessage({request:"browse_state"});
	// Request our stored "link_state" object, if it exists
	port.postMessage({request:"link_state"});	
	// Request our stored "paginaton_state" object, if it exists
	port.postMessage({request:"pagination_state"});
	
	// Commented this out, since we now call getAllDomains() from our messaging above!
	/**courseraBrowse.getAllDomains(
		function(){
			$debug_ON && console.log("Got allDomains");
		}
	);**/	
});