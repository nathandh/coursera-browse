/**
CourseraBrowse v: 0.1.0	|	05/05/2014
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
	: Initial implementation completed.		@nathandh
**/

// Our communications port
var port = chrome.extension.connect({name: "...CourseraBrowse ver: 0.1.0..."});
// A globals array of objects to store our retrieved category values
var categories = [];
// Used to save our state and scroll position
var browse_state = [];
// Listener links
var link_listeners = {
	'links_ids' : [],
	'location' : ""
};

// Main API view implementation
var courseraBrowse = {
	
	getUniversityDetails: function(university_ids, callback, update_html){
		console.log(university_ids);
		console.log("Getting University(s) details!");
		
		// case we got here through a click
		event.preventDefault();
		
		var formatted_ids;
		
		console.log("Array length is: " + university_ids.length);
		for (var i = 0; i < university_ids.length; i++){
			if (i == 0)
				formatted_ids = university_ids[0];
			else
				formatted_ids += ',' + university_ids[i];
		}
		
		console.log("Formatted university Ids: " + university_ids);
		
		//Ajax request
		var xhr = new XMLHttpRequest();
		var universityURL = 'https://api.coursera.org/api/catalog.v1/universities?ids=' + formatted_ids + '&includes=courses,instructors&fields=\
		name,description,banner,homeLink,location,classLogo,website,logo,squareLogo';
		
		console.log(universityURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}
		
		xhr.open("GET", universityURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var university_json = xhr.response;
			console.log(university_json);
		}
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);			
	},
	
	getInstructorDetails: function(instructor_ids, callback, update_html){
		console.log(instructor_ids);
		console.log("Getting Instructor(s) details!");
		
		// In case we got here through a click
		event.preventDefault();
		
		var formatted_ids;
		
		console.log("Array length is: " + instructor_ids.length);
		for (var i = 0; i < instructor_ids.length; i++){
			if (i == 0)
				formatted_ids = instructor_ids[0];
			else
				formatted_ids += ',' + instructor_ids[i];
		}
		
		console.log("Formatted instructor Ids: " + formatted_ids);
		
		//AJAX request
		var xhr = new XMLHttpRequest();
		var instructorURL = 'https:/api.coursera.org/api/catalog.v1/instructors?ids=' + formatted_ids + '&includes=universities,courses,sessions&\
		fields=photo,photo150,bio,fullName,title,department';
		
		console.log(instructorURL);
		
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
			console.log(instructor_json);
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);		
	},
	
	getSessionDetails: function(session_ids, callback, update_html){
		console.log(session_ids);
		console.log("Getting Session(s) details!");
		
		// Incase we got here through a click
		event.preventDefault();
		
		var formatted_ids;
		
		console.log("Array length is: " + session_ids.length);
		for (var i = 0; i < session_ids.length; i++){
			if (i === 0)
				formatted_ids = session_ids[0];
			else {
				formatted_ids += ',' + session_ids[i];
			}
		}
		
		console.log("Formatted session Ids: " + formatted_ids);
		
		//AJAX request
		var xhr = new XMLHttpRequest();
		var sessionURL = 'https://api.coursera.org/api/catalog.v1/sessions?ids=' + formatted_ids + '&includes=courses,instructors&fields=courseId,\
		status,active,startMonth,startDay,startYear,durationString';
		
		console.log(sessionURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}
		
		xhr.open("GET", sessionURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var session_json = xhr.response;
			console.log(session_json);
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);	
	},

	getCourseDetails: function(course_ids, callback, update_html) {
		console.log(course_ids);
		console.log("Getting Course details!");
		
		// In case we got here through a click
		event.preventDefault();	
			
		var formatted_ids; 
			
		console.log("Array length is: " + course_ids.length);	
		for (var i = 0; i < course_ids.length; i++){
			console.log("In formatting loop....");
			if (i === 0)
				formatted_ids = course_ids[i];
			else{
				formatted_ids += ',' + course_ids[i];
			}
		}
		
		console.log("Formatted Ids: " + formatted_ids);
		
		var xhr = new XMLHttpRequest();
		var courseURL = 'https://api.coursera.org/api/catalog.v1/courses?ids=' + formatted_ids + '\
		&includes=instructors,categories,sessions,universities&fields=photo,language,smallIcon,largeIcon,video,\
		videoId,aboutTheCourse,shortDescription,targetAudience,instructor,aboutTheInstructor,recommendedBackground,estimatedClassWork';
			
		console.log(courseURL);
		
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
			console.log(course_json);

			// Generate our SINGLE course detailed page
			if (update_html == true){
				console.log("Updating HTML in getCourseDetails()");
				
				// Place a navigation button to get back to ALL courses in a category listing
				$('#courseraDiv').html('<a id="btn_AllCategories" href="" class="button"><--All Categories</a>');
				var btn_all_categories = document.getElementById("btn_AllCategories");
				btn_all_categories.addEventListener("click", function(){
					event.preventDefault();
					courseraBrowse.getAllCategories(
						function(){
							console.log("Got allCategories");
						}
					);					
				}, false);
				$('#courseraDiv').append('<br />...also found in: <br />');
				
				// Zero out our link_listeners.links_ids array
				link_listeners.links_ids = [];
				
				// Place CATEGORY found navigation at top
				for(var category in course_json.linked.categories){
					// This is deliberately a closure in order to get correct values in our addEventListener
					// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures			
					(function () {	
					console.log("Linked category: " + course_json.linked.categories[category].name);
					var linked_categ_id = course_json.linked.categories[category].id;
					var linked_categ_name = course_json.linked.categories[category].name;
					// Append our DIV to create navigation based on Categories
					$('#courseraDiv').append('| <a class="button" id="btn_category_' + linked_categ_id + '" href=""> ' + linked_categ_name + '</a> ');
					// Add our listeners
					var link = document.getElementById('btn_category_' + linked_categ_id);
					// Add our links to our tracking array
						link_listeners.links_ids.push({_link:'btn_category_'+linked_categ_id,_current_id:linked_categ_id});
						link.addEventListener("click", function(){
							courseraBrowse.getCategoryCourses(
								linked_categ_id,
								function(){
									console.log("...beginning...single CategoryCourses XHR Request");
									// we will do nothing else here, since we are updating HTML 
									// in the 'onload' of our ajax request, as indicated by TRUE as follows 
								}, true);
						}, false);
					}())
				}
				
				// Some variables to make our output top HTML easier
				var description = course_json.elements[0].shortDescription;	
				var about_course = course_json.elements[0].aboutTheCourse;
				var instructor = course_json.elements[0].instructor;
				var about_instructor = course_json.elements[0].aboutTheInstructor;
				
				$('#courseraDiv').append('<h3 id="subTitle">' + course_json.elements[0].name + ' :</h3>');	
				$('#courseraDiv').append('<p><table id="tbl_course_' + course_json.elements[0].id + '_details"><tr><td><!--<a id=course_' + course_json.elements[0].id + ' href="">-->\
				<img class="course_icon" src="' + course_json.elements[0].largeIcon + '" alt="Course Icon"/><br/>\
				' + course_json.elements[0].name + '<br/><!--</a>--><hr /><td></tr><tr><td><table><tr><td><div id="course_' + course_json.elements[0].id + '_sessions"></div></td></tr></table></div><hr /></td></tr>\
				<tr><td><table><tr><td class="course_subhead">Description:<br /><br /></td></tr><tr><td class="course_description">' + description + '<br /><br /></td></tr></table></td></tr>\
				<tr><td><table><tr><td class="course_subhead">About the course:</td></tr><tr><td class="course_about">' + about_course + '</td></tr></table><hr />\
				<table><tr><td class="course_subhead">Instructors:</td></tr><tr><td id="instructors_info"></td></tr></table></td></tr></table><br /></p>');	
				
				
				// Get our INSTRUCTOR IDs associated with course
				var instructor_ids = [];
				for (var _instructor in course_json.linked.instructors){
					// Deliberate closure
					(function(){
						current_instructor = course_json.linked.instructors[_instructor];
						console.log("Linked instructor: " + current_instructor.firstName + "," + current_instructor.lastName);
						instructor_ids.push(current_instructor.id);
					}())
				}
				
				console.log("Instructor IDs: " + instructor_ids);
				
				// Get Instructor Data with IDs
				courseraBrowse.getInstructorDetails(
					instructor_ids,
					function(){
						var instructor_json = this;
						console.log("Instructor JSON received: " + instructor_json.elements);
						
						// Consruct our Instructor HTML
						var instructorHTML;
						for (var __instructor in instructor_json.elements){
							var this_instructor = instructor_json.elements[__instructor];
							if (__instructor == 0)
								instructorHTML = '<table><tr><td>';
								
							instructorHTML += '<table><tr><td class="td_instructor_photo"><img class="instructor_small_photo" src="' + this_instructor.photo150 + '" /></td><td><table class="tbl_instructor_info"><tr><td class="instructor_name">\
											' + this_instructor.firstName + ' ' + this_instructor.lastName + '</td></tr><tr><td>' + this_instructor.title + '</td></tr><tr><td class="td_instructor_department">\
											' + this_instructor.department + '</td></tr></table></td></tr></table>';
																		 
							if (__instructor == instructor_json.elements.length)
								instructorHTML += '</td></tr></table>';
						}
						
						console.log("InstructorHTML is: " + instructorHTML);
						// Append out instructor Info to our COURSE Page
						$('#instructors_info').append(instructorHTML);
						
						// Save our state and zero scroll position
						browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
						console.log("==> browse_state after 'getCourseDetails().getInstructorDetails()' call: " + browse_state[0].courseraDiv);
						
						// Sending updated state via messaging to background
						_browse_state = JSON.stringify(browse_state[0]);
						port.postMessage({browseState:_browse_state});						
					}, false);				
				
				// Get our SESSION IDs associated with a course...
				var session_ids = [];
				for (var session in course_json.linked.sessions){
					// Deliberate closure
					(function(){
						current_session = course_json.linked.sessions[session];
						console.log("Linked session: " + current_session.homeLink);
						session_ids.push(current_session.id);
					}())
				}
				
				console.log("Session IDs: " + session_ids);
				// Get Session Data with IDs
				courseraBrowse.getSessionDetails(
					session_ids,
					function(){
						var session_json = this;
						console.log("Session JSON received: " + session_json);
						
						// Construct out Session HTML
						var sessionHTML;
						for (var _session in session_json.elements){
							//Deliberate closure
							(function(){
							var this_session = session_json.elements[_session];
							// Helper variable for HTML
							var session_id = this_session.id;
							var session_start_date = this_session.startMonth + '/' + this_session.startDay + '/' + this_session.startYear;
							if (typeof(this_session.startMonth) == "undefined" || typeof(this_session.startDay) == "undefined" || typeof(this_session.startYear) == "undefined")
								session_start_date = "N/A";
							var session_duration = this_session.durationString;
							var session_home_link = '<a href="' + this_session.homeLink + '" target="_blank" title="Link: ' + this_session.homeLink + '">' + this_session.homeLink + '</a>';
							var session_status;
							if (this_session.status == 0)
								session_status = "Not currently offered.";
							else
								session_status = "Open";
							
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
						var session_div = document.getElementById("course_" + session_json.linked.courses[0].id + "_sessions");
						$(session_div).append(sessionHTML);
						$('#courseraDiv').append('<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
						// Make sure we are at top of page
						document.getElementById("toTopAnchor").click();

						// Save our state and zero scroll position
						browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
						console.log("==> browse_state after 'getCourseDetails()' call: " + browse_state[0].courseraDiv);
						
						// Sending updated state via messaging to background
						_browse_state = JSON.stringify(browse_state[0]);
						port.postMessage({browseState:_browse_state});	

						link_listeners.location = "getCategoryCourses";
						// Test send our links
						console.log("LINK Listeners" + link_listeners);
						_link_listeners = JSON.stringify(link_listeners);
						port.postMessage({linkListeners:_link_listeners});
					}, false);
			}
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);	
	},
	
	getCategoryCourses: function(category_id, callback, update_html) {
	
		var browse_category;
		
		// First let's get our category name given the passed ID
		for (var category in categories){
			if (categories[category].id == category_id){
				console.log("FOUND");
				browse_category = categories[category].name;
				break;
			}
			else
				console.log("...still LOOKING...");
		}
	
		// Prevent the default link click action so we can complete our request
		event.preventDefault();
		
		//alert("I'm getting all courses with: " + category_id);
		var xhr = new XMLHttpRequest();
		var categoryCoursesURL = 'https://api.coursera.org/api/catalog.v1/categories?id=' + category_id + '&includes=courses'; 
		
		// array to hold and sort out courses
		var courses = [];
		
		console.log(categoryCoursesURL);
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ // request is done
				if (xhr.status == 200){ // successfully
					callback.apply(xhr.response);
				}
			}
		}		
		
		xhr.open("GET", categoryCoursesURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function (e){
			var categories_courses_json = xhr.response;
			
			console.log(categories_courses_json);
			
			// We generate and output our HTML for Category Courses
			if (update_html == true){
				console.log("Updating HTML in getCategoryCourses()");
				
				//$('#courseraDiv').hide();
				// couse_ids is used so we can grab our small icons for each course
				var course_ids = [] 
				for (var course in categories_courses_json.linked.courses){
					var current_course = categories_courses_json.linked.courses[course];
					var id, shortName, name;
					for (var key in current_course){
						if (current_course.hasOwnProperty(key)){
							console.log("Key is: " + key);
							if (key ==  "id"){
								id = current_course[key];
								course_ids.push(id);
							}
							else if (key == "shortName")
								shortName = current_course[key];
							else if (key == "name")
								name = current_course[key];
						}
					}
					courses.push({
						"id":id,
						"shortName":shortName,
						"name":name,
						sortable: true,
						resizable: true
					});	
				}
				
				// Grab more course details for our courses
				courseraBrowse.getCourseDetails(
					course_ids,
					function(){
						// 'this' is set in the called funtion xhr above, 
						// it is the responce of the callback
						console.log(this);
						var courses_json = this;

						for (var course in courses_json.elements){
							var current_course = courses_json.elements[course];
							for (var _course in courses){
								var _current_course = courses[_course];
								if (current_course.id == _current_course.id){
									console.log(current_course.id  + "/" + _current_course.id);
									console.log("We have matched our course!");
									// Update courses with extra course data
									var smallIcon, largeIcon;
									var links;
									for (var key in current_course){
										if (current_course.hasOwnProperty(key)){
											console.log("Key is: " + key);
											if (key == "smallIcon"){
												smallIcon = current_course[key];
												console.log("Course: " + courses[_course].name);
												courses[_course].smallIcon = smallIcon;
											}
											if (key == "largeIcon"){
												largeIcon = current_course[key];
												courses[_course].largeIcon = largeIcon;
											}
											// Our linked object that holds information such as University ID
											// associated with our course.
											if (key == "links"){
												links = current_course[key];
												courses[_course].links = links;
											}
										}
									}
								}
							}
						}
						
						
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
						
						// Place a navigation button to get back to ALL category screen
						$('#courseraDiv').html('<a id="btn_AllCategories" href="" class="button"><--All Categories</a>');
						var btn_all_categories = document.getElementById("btn_AllCategories");
						btn_all_categories.addEventListener("click", function(){
							event.preventDefault();
							courseraBrowse.getAllCategories(
								function(){
									console.log("Got allCategories");
								}
							);							
						}, false);
					
						$('#courseraDiv').append('<h3 class="subTitle">' + browse_category + ' Courses:</h3>');
						
						//University IDs array to get college names
						var university_ids = [];
						
						// University/Course array of objects
						var univ_course = [];
						
						// Zero out our link_listeners.links_ids array
						link_listeners.links_ids = [];
						
						for (var i = 0; i < courses.length; i++){
							// This is deliberately a closure in order to get correct values in our addEventListener
							// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures			
							(function () {		
								console.log('Current COURSE is: ' + courses[i].name);
								
								// Output our category courses to the popup
								$('#courseraDiv').append('<p><table id=tbl_course_' + courses[i].id + '><tr><td><a id=course_' + courses[i].id + ' href="">\
								<img class="course_icon" src="' + courses[i].largeIcon + '" alt="Course Icon"/><br/>\
								' + courses[i].name + '<br/></a></td></tr><tr><td id="university_' + courses[i].links.universities[0] + '_' + courses[i].id + '"></td></tr></table><br /></p>');
								
								// Store our course UniversityID so we can update the page
								university_ids.push(courses[i].links.universities[0]);
								// Add key,value pair top our University/Course object
								univ_course.push({course_id:courses[i].id,univ_id:courses[i].links.universities[0]});
																
								// Create new listener for onclick event of each anchor tag
								var current_course_id = courses[i].id;
								console.log("Current COURSE ID is: " + current_course_id);
								var link = document.getElementById('course_' + current_course_id);
								var array_ccid = [current_course_id]; // since our getCourseDetails function relies on an array as an argument
								// Add our links to our tracking array
								link_listeners.links_ids.push({_link:'course_'+current_course_id,_current_id:current_course_id});								
								link.addEventListener("click", function(){
									courseraBrowse.getCourseDetails(
										array_ccid,
										function(){
											console.log("...beginning...single CourseDetails XHR Request");
											// we will do nothing else here, since we are updating HTML 
											// in the 'onload' of our ajax request, as indicated by TRUE as follows 
										}, true);
								}, false);							
							}())
						}
						link_listeners.location = "getCourseDetails";
						
						console.log(univ_course);
						// Get and append our University Names to the page
						courseraBrowse.getUniversityDetails(
							university_ids,
							function(){
								console.log("...beginning...University lookup in getCategoryCourses()");
								univ_json = this;
								
								for(var univ in univ_json.elements){
									var current_univ = univ_json.elements[univ];
									// Append our HTML with some University information
									// for each course in the category
									univ_html = '<table><tr><td class="categcourse_univ_name">' + current_univ.name + '</td></tr><tr><td class="categcourse_univ_loc">' + current_univ.location + '</td></tr></table>';
									console.log(univ_html);
									for(_univ_course in univ_course){
										curr_univ_course = univ_course[_univ_course];
										if(curr_univ_course.univ_id == current_univ.id){
										// Append our university information
										$('#university_' + current_univ.id + '_' + curr_univ_course.course_id).append(univ_html);
										}
									}
								}
							}, false);						
						
						$('#courseraDiv').append('<a id="toTopAnchor" class="button" href="#titleDiv">^Top</a>');
						
						// Make sure we are at top of page
						document.getElementById("toTopAnchor").click();	

						// Save our state and zero scroll position
						browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
						console.log("==> browse_state after 'getCategoryCourses()' call: " + browse_state[0].courseraDiv);
						
						// Sending updated state via messaging to background
						_browse_state = JSON.stringify(browse_state[0]);
						port.postMessage({browseState:_browse_state});	
						
						// Test send our links
						console.log("LINK Listeners" + link_listeners);
						_link_listeners = JSON.stringify(link_listeners);
						port.postMessage({linkListeners:_link_listeners});						
					}, false);	
			}
		};
		
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);		
	},

	getAllCategories: function(callback) {	
		console.log("...inside getAllCategories!");
				
		var xhr = new XMLHttpRequest();
		var allCategoriesURL = "https://api.coursera.org/api/catalog.v1/categories";
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4){ //request is done
				if (xhr.status == 200){ //successfully
					callback.apply(xhr.response);
				}
			}
		}		
	
		xhr.open("GET", allCategoriesURL, true);
		xhr.responseType = "json";
		
		xhr.onload = function(e){
			var categories_json = xhr.response;
			
			console.log(categories_json);
			
			$('#courseraDiv').html("");
			//$('#courseraDiv').hide();
			
			// Zero our our previous categories
			categories = [];
			
			for(var category in categories_json.elements){
				var current_category = categories_json.elements[category];
				var id, name, shortName, description;
				for (var key in current_category){
					if (current_category.hasOwnProperty(key)){
						if (key == "id")
							id = current_category[key];
						else if (key == "name")
							name = current_category[key];
						else if (key == "shortName")
							shortName = current_category[key];
						//else if (key == "description")
						//	description = current_category[key];
					}	
				}
				categories.push({
					"id":id,
					"name":name,
					"shortName":shortName,
					sortable: true,
					resizeable: true
				});
				//$('#courseraDiv').append('<p>Category: ' + name + '<br /></p>'
				//);
			}
			
			// Sort by Category NAME ascending
			categories.sort(function(a, b){
				var cat1 = a.name.toLowerCase(), cat2 = b.name.toLowerCase();
				if (cat1 < cat2) // sort ascending
					return -1;
				if (cat1 > cat2)
					return 1;
				return 0;		// default, no sorting
			});
			
			// Zero out our link_listeners.links_ids array
			link_listeners.links_ids = [];
		
			for (var i = 0; i < categories.length; i++){
				// This is deliberately a closure in order to get correct values in our addEventListener
				// see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
				(function () {
					console.log('Current CATEGORY is: ' + categories[i].name);
					
					// Creative Commons images for our Categories
					var img_src;
					if (categories[i].id == 22)
						img_src = "img/categories/arts_categ.png";
					else if (categories[i].id == 10)
						img_src = "img/categories/bio_categ.png";
					else if (categories[i].id == 13)
						img_src = "img/categories/business_categ.png";
					else if (categories[i].id == 24)
						img_src = "img/categories/chemistry_categ.png";
					else if (categories[i].id == 17)
						img_src = "img/categories/ai_categ.png";
					else if (categories[i].id == 12)
						img_src = "img/categories/cs_se_categ.png";
					else if (categories[i].id == 11)
						img_src = "img/categories/cs_sec_categ.png";	
					else if (categories[i].id == 1)
						img_src = "img/categories/cs_theory_categ.png";	
					else if (categories[i].id == 2)
						img_src = "img/categories/finance_categ.png";		
					else if (categories[i].id == 14)
						img_src = "img/categories/edu_categ.png";	
					else if (categories[i].id == 25)
						img_src = "img/categories/energy_categ.png";	
					else if (categories[i].id == 15)
						img_src = "img/categories/engineering_categ.png";							
					else if (categories[i].id == 19)
						img_src = "img/categories/food_categ.png";
					else if (categories[i].id == 8)
						img_src = "img/categories/health_categ.png";						
					else if (categories[i].id == 6)
						img_src = "img/categories/humanities_categ.png";						
					else if (categories[i].id == 4)
						img_src = "img/categories/info_tech_categ.png";						
					else if (categories[i].id == 21)
						img_src = "img/categories/law_categ.png";
					else if (categories[i].id == 5)
						img_src = "img/categories/math_categ.png";						
					else if (categories[i].id == 3)
						img_src = "img/categories/medical_categ.png";	
					else if (categories[i].id == 18)
						img_src = "img/categories/music_categ.png";
					else if (categories[i].id == 9)
						img_src = "img/categories/physical_science_categ.png";						
					else if (categories[i].id == 23)
						img_src = "img/categories/physics_categ.png";	
					else if (categories[i].id == 20)
						img_src = "img/categories/social_science_categ.png";							
					else if (categories[i].id == 16)
						img_src = "img/categories/statistics_categ.png";						
					else if (categories[i].id == 26)
						img_src = "img/categories/teacher_categ.png";							
					else 
						img_src = "img/categories/coursera-logo-nobg-blue_48.png";
					
					// Output our categories to the popup
					$('#courseraDiv').append('<p><table id=tbl_category_' + categories[i].id + '><tr><td><a class="categoryAnchor" id=category_' + categories[i].id + ' href="">\
					<img src="' + img_src + '" alt="Coursera Logo"/><br/><div class="categoryName">\
					' + categories[i].name + '</div><div class="categoryNumCourses" id="category_' + categories[i].id + '_numCourses"></div></a><td></tr></table></p>');
					
					// Determine how many courses are in each category, and append our DIV
					var _num_category_id = categories[i].id;
					courseraBrowse.getCategoryCourses(
						categories[i].id,
						function(){
							// Handle our callback here
							_courses_json = this;
							var categ_num_courses = _courses_json.linked.courses.length;
							console.log("Courses length: " + categ_num_courses);
							$('#category_' + _num_category_id + '_numCourses').append('<strong>' + categ_num_courses + '</strong> total courses');
						}, false);
					
					// Create new listener for onclick event of anchor tag
					var current_id = categories[i].id;
					console.log("Current ID is: " + current_id);
					var link = document.getElementById('category_' + current_id);
					// Add our links to our tracking array
					link_listeners.links_ids.push({_link:'category_'+current_id,_current_id:current_id}); 
					link.addEventListener("click", function(){
						courseraBrowse.getCategoryCourses(
							current_id,
							function(){
								console.log("...beginning...single CategoryCourses XHR Request");
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
			
			// Save and Send our updated Categories via messaging to background
			_last_categories = JSON.stringify(categories);
			port.postMessage({lastCategories:_last_categories});			
						
			// Save our browse state and zero scroll position
			browse_state[0] = {"courseraDiv":$('#courseraDiv').html(),"scrollTop":0};
			console.log("==> browse_state after 'getAllCategories()' call: " + browse_state[0].courseraDiv);
			
			// Sending updated state via messaging to background
			_browse_state = JSON.stringify(browse_state[0]);
			port.postMessage({browseState:_browse_state});
			
			link_listeners.location = "getCategoryCourses";
			// Test send our links
			console.log("LINK Listeners" + link_listeners);
			_link_listeners = JSON.stringify(link_listeners);
			port.postMessage({linkListeners:_link_listeners});
		};
		// Set correct header for form data
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(null);
	},
	
	updateLinkListeners: function (links, callback){
		console.log("...Updating link listeners on page....");
		console.log(links[0].location);
		
		// First ATTEMPT to restore our ALL Categories link to get back to the main category page:
		// this will fail on MAIN page since we don't have our btn_AllCategories yet on the page
		try {
			(function (){
				var btn_all_categories = document.getElementById("btn_AllCategories");
				console.log("Button element is: " + btn_all_categories);
				btn_all_categories.addEventListener("click", function(){
					event.preventDefault();
					courseraBrowse.getAllCategories(
						function(){
							console.log("Got allCategories");
						}
					);
				}, false);	
			}())
		} catch (e){
			console.log("Error: " + e);
		}
				
		// Restore remaining links on the page
		var location = links[0].location;
		for (var link_obj in links[0].links_ids){
			// Deliberate closure
			(function (){
				var current_link = document.getElementById(links[0].links_ids[link_obj]._link);
				var current_id = links[0].links_ids[link_obj]._current_id;
				console.log("Activating link: " + links[0].links_ids[link_obj]._link + " with current_id of: " + current_id);
				if (location == "getCategoryCourses"){
					current_link.addEventListener("click", function(){
						courseraBrowse.getCategoryCourses(
							current_id,
							function(){
								console.log("...beginning...single CategoryCourses XHR Request");
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
								console.log("...beginning...single CourseDetails XHR Request");
								// we will do nothing else here, since we are updating HTML 
								// in the 'onload' of our ajax request, as indicated by TRUE as follows 
							}, true);	
						}, false);					
				}			
			}())
		}
		callback(0);
	}

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
	8) lastCategoriesUpdate
**/
port.onMessage.addListener(
	function(msg) {
		for(key in msg){			
			console.log("MSG $Key is: " + key); 
			console.log("coursera_browse.js Received message: " + msg[key]);
			if (key == "notification"){
				// skip
			} else if (key == "request"){
				// skip
			} else if (key == "response"){
				if(msg[key] == "0_browse_state"){
					// Load our default page of Coursera Categories
					courseraBrowse.getAllCategories(
						function(){
							console.log("Got allCategories");
						}
					);					
				}
			} else if (key == "acknowledge"){
				// skip
			} else if (key == "browseStateUpdate"){
				port.postMessage({acknowledge:'browse_state update received'});
				console.log("!~~~~coursera_browse.js has received browse_state message~~~~!");
				browse_state[0] = JSON.parse(msg[key]);
				console.log("JSON parsed browse_state msg: " + browse_state[0].courseraDiv);
				
				// Set our HTML to the data sent
				$('#courseraDiv').html(browse_state[0].courseraDiv);
				$('#courseraDiv').show();
			} else if (key == "linkStateUpdate"){
				port.postMessage({acknowledge:'link_state update received'});
				console.log("!~~~~coursera_browse.js has received link_state message~~~~!");
				link_listeners[0] = JSON.parse(msg[key]);
				console.log("JSON parsed link_state msg 'location': " + link_listeners[0].location);
				
				// Update our listners
				console.log("...initiating Listener update!...");
				// Call our updateLinkListener function
				courseraBrowse.updateLinkListeners(link_listeners, function (response){
					if(response == 0){
						console.log("Successfully updated LinkListeners!");
					} else {
						console.log("ERROR updating LinkListeners!: " + response);
					}
				});
			} else if (key == "lastCategoriesUpdate"){
				port.postMessage({acknowledge:'last_categories update received'});
				console.log("!~~~~coursera_browse.js has received last_categories message~~~~!");
				// Update our categories
				console.log("...initiating Category update!...");				
				categories = JSON.parse(msg[key]);
				console.log("JSON parsed last_categories msg: " + categories);
			}				
		}
}); 

// Runs at popup.html load
document.addEventListener('DOMContentLoaded', function () {
	port.postMessage({response:"Hello: background.js!"});
	
	// Request our stored "last_categories" object, if it exists
	port.postMessage({request:"last_categories"});	
	// Request our stored "browse_state" object, if it exists
	port.postMessage({request:"browse_state"});
	// Request our stored "link_state" object, if it exists
	port.postMessage({request:"link_state"});	
	
	// Commented this out, since we now call getAllCategories() from our messaging above!
	/**courseraBrowse.getAllCategories(
		function(){
			console.log("Got allCategories");
		}
	);**/	
});