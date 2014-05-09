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

background.js SPECIFIC:

This is the BACKEND javascript file which handles the storage
and communication logic for the extension.

Interaction and ongoing communication exists between this 
file ('background.js') and the FRONT javascript file: ('coursera_browse.js'). 
Specifically, when the popup is closed by the end-user data and 
messages are sent HERE in order to save the current end-user BROWSE-state 
using the 'chrome.storage.local' api. 

STORAGE actually takes place here, and string-parsed JSON messages are 
passed back and forth in order to implement saving the browse state and
creating a better user experience.

version: 0.1.0	|	05/05/2014
	: Initial implementation completed.		@nathandh
**/

// Used to save our state and scroll position
// received from coursera_browse.js periodically
// through messaging
var browse_state = [];

// Used to save our attached link listeners
var link_listeners = [];

// Used to save our last Coursera categories retrieved
var last_categories = [];

// For Chrome messaging
// see: https://developer.chrome.com/extensions/messaging
if (!chrome.runtime) {
    // Chrome 20-21
    chrome.runtime = chrome.extension;
} else if(!chrome.runtime.onMessage) {
    // Chrome 22-25
    chrome.runtime.onMessage = chrome.extension.onMessage;
    chrome.runtime.sendMessage = chrome.extension.sendMessage;
    chrome.runtime.onConnect = chrome.extension.onConnect;
    chrome.runtime.connect = chrome.extension.connect;
}

// The main storage implementation
var chromeStorage = {

	/**
	Attempts to GET our browse_state from chrome.storage.local, if exists
	**/
	getBrowseState: function(callback){
		try{
			chrome.storage.local.get(
				'stored_browseState',
				function(stored_state){						
					// just return our saved data for processing below
					callback(stored_state);
				}
			);
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
			
					/**
					if(typeof(browse_state) == "undefined" || browse_state.length == 0){
						// We have no browse_state
						port.postMessage({response:"0_browse_state"});
						console.log("no BROWSE_STATE available!");
					} else {
						var _browseState_response = JSON.stringify(browse_state[0]);
						port.portMessage({browseState:_browseState_response});
						console.log("...sent browse_state reply: " + _browseState_response);
					}
					**/
		}
	},
	
	/**
	Attempts to SET our browse_state to chrome.storage.local
	**/
	setBrowseState: function(state_data){
		try{
			console.log("SET-BROWSE-STATE: " + state_data);
			chrome.storage.local.set(
			{'stored_browseState':state_data},
			function(){
				console.log("Saving browse_state...");
				console.log('browse_state was saved to "stored_browseState" as: ' + state_data);
			});	
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	},
	
	/**
	Attempts to GET our link_state from chrome.storage.local, if exists
	**/
	getLinkState: function(callback){
		try{
			chrome.storage.local.get(
				'stored_linkState',
				function(stored_state){						
					// just return our saved data for processing below
					callback(stored_state);
				}
			);
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
		}
	},
	
	/**
	Attempts to SET our link_state to chrome.storage.local
	**/
	setLinkState: function(state_data){
		try{
			console.log("SET-LINK-STATE: " + state_data);
			chrome.storage.local.set(
			{'stored_linkState':state_data},
			function(){
				console.log("Saving link_state...");
				console.log('link_state was saved to "stored_linkState" as: ' + state_data);
			});	
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	},
	
	/**
	Attempts to GET our last_categories from chrome.storage.local, if exists
	**/
	getLastCategories: function(callback){
		try{
			chrome.storage.local.get(
				'stored_lastCategories',
				function(category_data){						
					// just return our saved data for processing below
					callback(category_data);
				}
			);
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
		}
	},	

	/**
	Attempts to SET our last_categories to chrome.storage.local
	**/
	setLastCategories: function(category_data){
		try{
			console.log("SET-LAST-CATEGORIES: " + category_data);
			chrome.storage.local.set(
			{'stored_lastCategories':category_data},
			function(){
				console.log("Saving category_data...");
				console.log('category_data was saved to "stored_lastCategories" as: ' + category_data);
			});	
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	}	
};

// Messaging implementation is here.
// Connect our app to listener to so we know when its unloaded
// see: https://developer.chrome.com/extensions/runtime
// and: http://stackoverflow.com/questions/15798516/is-there-an-event-for-when-a-chrome-extension-popup-is-closed
// and: http://stackoverflow.com/questions/11782875/chrome-message-passing-error-attempting-to-use-a-disconnected-port-object
// Establish communication channel
/**
Some app defined recognized message types to make
sending messages a bit easier in our program:
	1) notification
	2) request
	3) response
	4) acknowledge
	5) browseState
	6) linkListeners
	7) lastCategories
**/
chrome.extension.onConnect.addListener(function(port){
	port.postMessage({notification:"background.js connecting for messaging..."});
	port.postMessage({notification:"...CourseraBrowse ver: 0.1.0..."})	
	port.onMessage.addListener(
		function(msg) {		
		port.postMessage({response:"Hello: Popup!"});

		for(key in msg){
			console.log("MSG $Key is: " + key); 
			console.log("background.js Received message: " + msg[key]);
			if (key == "notification"){
				// skip
			} else if (key == "request"){
				if(msg[key] == "browse_state"){
					// We have a REQUEST for our BROWSE STATE
					console.log("...acting on BROWSE_STATE request....");
					
					// See if we have some synced data available in storage
					/**
						getBrowseState()'s callback function handles our reply
						and determines how we load our popup
					**/
					chromeStorage.getBrowseState(
						function(last_browseState){
							console.log(last_browseState);
							if (typeof(last_browseState) == "undefined" || last_browseState == null || last_browseState.hasOwnProperty('stored_browseState') == false){
								port.postMessage({response:"0_browse_state"});
							} else {
								console.log("LAST BROWSE state returned is: " + last_browseState);
								if(typeof(last_browseState.stored_browseState.courseraDiv) == "undefined"){
									port.postMessage({response:"0_browse_state"})
								} else if (last_browseState.stored_browseState.courseraDiv.length == 0){
									port.postMessage({response:"0_browse_state"})
								} else {
									// Send our storage back to coursera_browse.js to append to page DIV
									console.log("Replying with courserDiv contents from storage....");
									var state_msg = JSON.stringify(last_browseState.stored_browseState)
									//console.log(state_msg);
									port.postMessage({browseStateUpdate:state_msg});
								}											
							}
		
					});
				} else if (msg[key] == "link_state"){
					// We have a REQUEST for our LINK STATE
					console.log("...acting on LINK_STATE request....");
					
					// See if we have some synced data available in storage
					/**
						getLinksState()'s callback function handles our reply
						and determines how we load our popup
					**/
					chromeStorage.getLinkState(
						function(last_linkState){
							console.log(last_linkState);
							if (typeof(last_linkState) == "undefined" || last_linkState == null || last_linkState.hasOwnProperty('stored_linkState') == false){
								port.postMessage({response:"0_link_state"});
							} else {
								console.log("LAST LINK state returned is: " + last_linkState);
								if(typeof(last_linkState.stored_linkState.links_ids) == "undefined"){
									port.postMessage({response:"0_link_state"})
								} else if (last_linkState.stored_linkState.links_ids.length == 0){
									port.postMessage({response:"0_link_state"})
								} else {
									// Send our storage back to coursera_browse.js to use
									console.log("Replying with linkState contents from storage....");
									var state_msg = JSON.stringify(last_linkState.stored_linkState)
									//console.log(state_msg);
									port.postMessage({linkStateUpdate:state_msg});
								}											
							}
		
					});				
				} else if (msg[key] == "last_categories"){
					// We have a REQUEST for our LAST CATEGORIES
					console.log("...acting on LAST_CATEGORIES request....");
					
					// See if we have some synced data available in storage
					/**
						getLastCategories()'s callback function handles our reply
						and determines how we load our popup
					**/
					chromeStorage.getLastCategories(
						function(last_categoriesState){
							console.log(last_categoriesState);
							if (typeof(last_categoriesState) == "undefined" || last_categoriesState == null || last_categoriesState.hasOwnProperty('stored_lastCategories') == false){
								port.postMessage({response:"0_last_categories"});
							} else {
								console.log("LAST CATEGORIES returned is: " + last_categoriesState);
								if(typeof(last_categoriesState.stored_lastCategories) == "undefined"){
									port.postMessage({response:"0_last_categories"})
								} else if (last_categoriesState.stored_lastCategories.length == 0){
									port.postMessage({response:"0_last_categories"})
								} else {
									// Send our storage back to coursera_browse.js to use
									console.log("Replying with lastCategories contents from storage....");
									var state_msg = JSON.stringify(last_categoriesState.stored_lastCategories)
									//console.log(state_msg);
									port.postMessage({lastCategoriesUpdate:state_msg});
								}											
							}
		
					});	
				}	
			} else if (key == "response"){
				// skip
			} else if (key == "acknowledge"){
				// skip	
			} else if (key == "browseState"){
				console.log("!~~~~background.js has received browse_state message~~~~!");
				browse_state[0] = JSON.parse(msg[key]);
				// console.log("JSON parsed browse_state msg: " + browse_state[0].courseraDiv);
			} else if (key == "linkListeners"){
				console.log("!^^^^background.js has recieved link_listeners message^^^^!");
				link_listeners[0] = JSON.parse(msg[key]);
				console.log("JSON parsed link_listeners msg: " + link_listeners[0]);
			} else if (key = "lastCategories"){
				console.log("!^^^^background.js has recieved last_categories message^^^^!");
				last_categories[0] = JSON.parse(msg[key]);
				console.log("JSON parsed last_categories msg: " + last_categories[0]);			
			}
		} 	
	}); 
	
	// When the popup is closed, the port gets disconnected
	// and signals background.js to save the current browse state data
	port.onDisconnect.addListener(
		function(){
		console.log("background.js ...disconnecting...");
		// Save our last categories, calling internal function
		chromeStorage.setLastCategories(last_categories[0]);		
		// Save our storage state, calling internal function
		chromeStorage.setBrowseState(browse_state[0]);
		// Save out linkListener state, calling internal function
		chromeStorage.setLinkState(link_listeners[0]);
	});			
});