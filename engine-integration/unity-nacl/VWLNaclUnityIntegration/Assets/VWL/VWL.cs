// VWL.cs 
// The master control script for VWL, this script should be attached to a
// gameObject somewhere in the scene.

using UnityEngine;
using System.Collections;

public class VWL : MonoBehaviour {
	
	//
	// Mandatory: must be set before gameObject is Awake!
	//
	
	// the player object
	public OVRPlayerController player;

	// all persistent links in the scene
	public VWLLink[] linkArray;
	
	// the temporary link
	public VWLLink temporaryLink;
	
	// url of the left and right initial entry images
	public string entryUrlLeft = "leftEntry.png";
	public string entryUrlRight = "rightEntry.png";
	
	// keys to open links
	public string persistentLinkKey = "space";
	public string temporaryLinkKey = "return";
	
	// max distance at which the player can select a link or open a new link
	public float selectDistance = 8;
	
	//
	// Optional
	//
	
	// material to be overlaid over a link when selected
	public Material selectMaterial = null;
	
	
	private string[] loadedArray = new string[0];
	private string temporaryLinkUrl = null;
	
	void Awake() {
		Application.ExternalEval("VWL_Init(" + entryUrlLeft + "|" + entryUrlRight + ")");
		
		// get the list of loaded worlds from the browser
		Application.ExternalEval("VWL_GetLoadedList(" + gameObject.name + ")");
		
		foreach (VWLLink link in linkArray) {
			link.InitVWL(this);
			link.gameObject.SetActive(true);
		}
		OVRDevice.CallWhenInitDone(VWLEntrance.Init);
	}
	
	void Update() {
		// get mouse lock
		if (Input.GetMouseButtonDown(0))
			Screen.lockCursor = true;
		
		// cast a ray from the player
		RaycastHit hit;
		Vector3 forwardDir = player.DirXformProperty.TransformDirection(Vector3.forward);
		Physics.Raycast(player.transform.position, forwardDir, out hit, selectDistance);
		
		// if a persistent link is in front of the player, select/open it
		bool open = Input.GetKeyDown(persistentLinkKey);
		foreach (VWLLink link in linkArray) {
			bool enable = (hit.collider == link.collider);
			link.Select(enable, open);
		}

		// if the player is requesting to create a link, create it at the end of the ray
		if (Input.GetKeyDown(temporaryLinkKey)) {
			temporaryLink.gameObject.SetActive(false);
			if (loadedArray.Length > 0) {

				// find next URL to open link to
				if (temporaryLinkUrl != null) {
					int index;
					for (index = 0; index < loadedArray.Length-1; index++) {
						if (temporaryLinkUrl == loadedArray[index]) {
							break;
						}
					}
					if (index < loadedArray.Length-1) {
						temporaryLinkUrl = loadedArray[index+1];
					}
					else {
						temporaryLinkUrl = loadedArray[0];
					}
				}
				else {
					temporaryLinkUrl = loadedArray[0];
				}
				
				// set and activate link
				temporaryLink.InitVWL(this);
				if (hit.collider != null) {
					temporaryLink.transform.position = new Vector3(
						hit.point.x, 2, hit.point.z);
				}
				else {
					temporaryLink.transform.position = new Vector3(
						player.transform.position.x + forwardDir.x * selectDistance,
						2,
						player.transform.position.z + forwardDir.z * selectDistance);
				}
				temporaryLink.url = temporaryLinkUrl;
				temporaryLink.gameObject.SetActive(true);
				temporaryLink.LookAtPlayer();
			}
		}
	}
	
	// called by the browser
	public void ReceiveLoadedList(string listStr) {
		loadedArray = listStr.Split('|');
	}
	
}
