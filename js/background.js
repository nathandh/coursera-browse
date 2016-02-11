/**
CourseraBrowse v: 0.2.1	|	02/10/2016
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
	: Initial implementation completed.			@nathandh
	
version: 0.2.0	|	02/10/2016
	: Adapted to latest Coursera API changes	@nathandh
	: Initial paginanation support on browse	
	
version: 0.2.1	|	02/10/2016
	: Fixed INSTALL/UPDATE issue with 			@nathandh
      clearing local storage to prevent
	  potential extension load errors/problems
**/

// Used to save our state and scroll position
// received from coursera_browse.js periodically
// through messaging
var browse_state = [];

// Used to save our attached link listeners
var link_listeners = [];

// Used to save our last Coursera domains retrieved
var last_domains = [];

// Used to save our last Pagination browse state
var pagination_state = [];

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
	Attempts to GET our last_domains from chrome.storage.local, if exists
	**/
	getLastDomains: function(callback){
		try{
			chrome.storage.local.get(
				'stored_lastDomains',
				function(domain_data){						
					// just return our saved data for processing below
					callback(domain_data);
				}
			);
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
		}
	},	

	/**
	Attempts to SET our last_domains to chrome.storage.local
	**/
	setLastDomains: function(domain_data){
		try{
			console.log("SET-LAST-DOMAINS: " + domain_data);
			chrome.storage.local.set(
			{'stored_lastDomains':domain_data},
			function(){
				console.log("Saving domain_data...");
				console.log('domain_data was saved to "stored_lastDomains" as: ' + domain_data);
			});	
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	},

	/**
	Attempts to GET our pagination_state from chrome.storage.local, if exists
	**/
	getPaginationState: function(callback){
		try{
			chrome.storage.local.get(
				'stored_paginationState',
				function(pagination_data){						
					// just return our saved data for processing below
					callback(pagination_data);
				}
			);
		} catch (e){
			console.log("Failure GETTING storage: " + e);	
		}
	},	

	/**
	Attempts to SET our pagination_data to chrome.storage.local
	**/
	setPaginationState: function(pagination_data){
		try{
			console.log("SET-PAGINATION-STATE: " + pagination_data);
			chrome.storage.local.set(
			{'stored_paginationState':pagination_data},
			function(){
				console.log("Saving pagination_data...");
				console.log('pagination_data was saved to "stored_paginationState" as: ' + pagination_data);
			});	
		} catch (e){
			console.log("Failure SETTING storage: " + e);
		}
	},

	/** 
	RESETS our pagination_data and state on chrome.storage.local
	**/
	resetPaginationState: function(pagination_data){
		try{
			console.log("RESET-PAGINATION-STATE: " + pagination_data);
			chrome.storage.local.set(
			{'stored_paginationState':pagination_data},
			function(){
				console.log("Resetting pagination data...");
				console.log('pagination_data was saved to "stored_paginationState" as: ' + pagination_data);
			});
		} catch (e){
			console.log("Failure RESETTING pagination_data in storage: " + e);
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
	7) lastDomains
	8) paginationState		// @nathandh - Added 02/10/2016
**/
chrome.extension.onConnect.addListener(function(port){
	port.postMessage({notification:"background.js connecting for messaging..."});
	port.postMessage({notification:"...CourseraBrowse ver: 0.2.1..."});	
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
								// We need to 1st reset our pagination_state to avoid errors
								pagination_state[0] = [];
								// RESET our pagination state, calling internal function
								chromeStorage.resetPaginationState(pagination_state[0]);
								// Clear our entire Local STORAGE
								chrome.storage.local.clear(
									function(){
										console.log("Cleared local storage since we have 0_browse_state");
								});
								
								// Send 0 browse state message
								port.postMessage({response:"0_browse_state"});
							} else {
								console.log("LAST BROWSE state returned is: " + last_browseState);
								if(typeof(last_browseState.stored_browseState.courseraDiv) == "undefined"){
									// We need to 1st reset our pagination_state to avoid errors
									pagination_state[0] = [];
									// RESET our pagination state, calling internal function
									chromeStorage.resetPaginationState(pagination_state[0]);
									// Clear our entire Local STORAGE
									chrome.storage.local.clear(
										function(){
											console.log("Cleared local storage since we have 0_browse_state");
									});
									
									// Send 0 browse state message
									port.postMessage({response:"0_browse_state"})
								} else if (last_browseState.stored_browseState.courseraDiv.length == 0){
									// We need to 1st reset our pagination_state to avoid errors
									pagination_state[0] = [];
									// RESET our pagination state, calling internal function
									chromeStorage.resetPaginationState(pagination_state[0]);
									// Clear our entire Local STORAGE
									chrome.storage.local.clear(
										function(){
											console.log("Cleared local storage since we have 0_browse_state");
									});
									
									// Send 0 browse state message
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
				} else if (msg[key] == "last_domains"){
					// We have a REQUEST for our LAST DOMAINS
					console.log("...acting on LAST_DOMAINS request....");
					
					// See if we have some synced data available in storage
					/**
						getLastDomains()'s callback function handles our reply
						and determines how we load our popup
					**/
					chromeStorage.getLastDomains(
						function(last_domainsState){
							console.log(last_domainsState);
							if (typeof(last_domainsState) == "undefined" || last_domainsState == null || last_domainsState.hasOwnProperty('stored_lastDomains') == false){
								port.postMessage({response:"0_last_domains"});
							} else {
								console.log("LAST DOMAINS returned is: " + last_domainsState);
								if(typeof(last_domainsState.stored_lastDomains) == "undefined"){
									port.postMessage({response:"0_last_domains"});
								} else if (last_domainsState.stored_lastDomains.length == 0){
									port.postMessage({response:"0_last_domains"});
								} else {
									// Send our storage back to coursera_browse.js to use
									console.log("Replying with lastDomains contents from storage....");
									var state_msg = JSON.stringify(last_domainsState.stored_lastDomains);
									//console.log(state_msg);
									port.postMessage({lastDomainsUpdate:state_msg});
								}											
							}
		
					});	
				} else if (msg[key] == "pagination_state"){
					// We have a REQUEST for our PAGINATION state
					console.log("...acting on PAGINATION_STATE request....");
					
					// See if we have some synced data available in storage
					/**
						getPaginationState()'s callback function handles our reply
						and determines how we load our popup
					**/
					chromeStorage.getPaginationState(
						function(last_paginationState){
							console.log(last_paginationState);
							if (typeof(last_paginationState) == "undefined" || last_paginationState == null || last_paginationState.hasOwnProperty('stored_paginationState') == false){
								port.postMessage({response:"0_pagination_state"});
							} else {
								console.log("LAST PAGINATION STATE returned is: " + last_paginationState);
								if (typeof(last_paginationState.stored_paginationState) == "undefined"){
									port.postMessage({response:"0_pagination_state"});
								} else if (last_paginationState.stored_paginationState.length == 0){
									port.postMessage({response:"0_pagination_state"});
								} else {
									// Send our storage back to coursera_browse.js to use
									console.log("Replying with last_paginationState contents from storage....");
									var state_msg = JSON.stringify(last_paginationState.stored_paginationState);
									console.log(state_msg);
									port.postMessage({paginationStateUpdate:state_msg});
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
			} else if (key == "lastDomains"){
				console.log("!^^^^background.js has recieved last_domains message^^^^!");
				last_domains[0] = JSON.parse(msg[key]);
				console.log("JSON parsed last_domains msg: " + last_domains[0]);			
			} else if (key == "paginationState"){
				console.log("!****background.js has received pagination_state message****!");
				pagination_state[0] = JSON.parse(msg[key]);
				console.log("JSON parsed pagination_state msg: " + pagination_state[0]);
			}
		} 	
	}); 
	
	// When the popup is closed, the port gets disconnected
	// and signals background.js to save the current browse state data
	port.onDisconnect.addListener(
		function(){
		console.log("background.js ...disconnecting...");
		// Save our last domains, calling internal function
		chromeStorage.setLastDomains(last_domains[0]);		
		// Save our storage state, calling internal function
		chromeStorage.setBrowseState(browse_state[0]);
		// Save our linkListener state, calling internal function
		chromeStorage.setLinkState(link_listeners[0]);
		// Save our pagination state, calling internal function
		chromeStorage.setPaginationState(pagination_state[0]);
	});			
});

// ON First Install or Update, Clear local storage to prevent problems
chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install"){
		// Clear our Local STORAGE to prevent INSTALL problems
		chrome.storage.local.clear(
			function(){
				console.log("Cleared local storage since we are INSTALLING");
				console.log("1st INSTALL of CourseraBrowse");
		});
	} else if (details.reason == "update"){
		// Clear our Local STORAGE to prevent update problems
		chrome.storage.local.clear(
			function(){
				console.log("Cleared local storage since we are UPDATING");
				var currVersion = chrome.runtime.getManifest().version;
				console.log("Updated from: " + details.previousVersion + " to: " + currVersion + " successfully :-)");
		});
	}
	
});