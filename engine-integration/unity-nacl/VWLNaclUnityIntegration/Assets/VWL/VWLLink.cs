// VWLLink.cs
// Attach to a gameObject to make a VWL link

using UnityEngine;
using System.Collections;

public class VWLLink : MonoBehaviour {
	
	//
	// Mandatory: must be set before gameObject is enabled!
	//
	
	public string url;
	public VWLEntrance entrance;
	public bool deactivateAfterEnter = false;
	

	private VWL vwl;
	private Texture poster;
	private Vector3 rotateLink;
	private bool loaded = false;
	
	public void InitVWL(VWL _vwl) {
		vwl = _vwl;
	}
	
	void Awake() {
		rotateLink = transform.rotation.eulerAngles;
	}
	
	void OnEnable() {
		poster = renderer.material.mainTexture;
		
		// get the linked world's images from the browser
		Application.ExternalEval("VWL_GetInfo(" + url + "|" + this.gameObject.name + ")");
	}
	
	// called by the browser
	void ReceivePoster(string paramsStr) {
		string[] paramArray = paramsStr.Split('|');
		if (paramArray[0] == "undefined" ||
			paramArray[1] == "undefined" ||
			paramArray[2] == "undefined") return;
		StartCoroutine(LoadPoster(paramArray[0], paramArray[1], paramArray[2]));
	}
	IEnumerator LoadPoster(string srcL, string srcR, string src2d) {
		// 2d only for now
		WWW www;
		if (src2d != "null") {
			www = new WWW(src2d);
		}
		else if (srcL != "null") {
			www = new WWW(srcL);
		}
		else if (srcR != "null") {
			www = new WWW(srcR);
		}
		else {
			return false;
		}
		yield return www;
		poster = www.texture;
		if (!loaded) {
			renderer.material.mainTexture = poster;
		}
	}
	
	// called by the browser
	void ReceiveEntryImage(string paramsStr) {
		loaded = true;
		string[] paramArray = paramsStr.Split('|');
		StartCoroutine(LoadEntryImage(paramArray[0], 0));
		StartCoroutine(LoadEntryImage(paramArray[1], 1));
	}
	IEnumerator LoadEntryImage(string src, int imageIndex) {
		if (src.StartsWith("http://")) {
			WWW www = new WWW(src);
			yield return www;
			if (imageIndex == 0) {
				VWLStereoTexture.Add(renderer, www.texture, null);
			}
			else if (imageIndex == 1) {
				VWLStereoTexture.Add(renderer, null, www.texture);
			}
		}
		else if (src.StartsWith("data:image/png;base64,")) {
			byte[] image = System.Convert.FromBase64String(src.Substring(22));
			Texture2D tex2d = new Texture2D(2, 2); // we may want to adjust this size
			tex2d.LoadImage(image);
			if (imageIndex == 0) {
				VWLStereoTexture.Add(renderer, tex2d, null);
			}
			else if (imageIndex == 1) {
				VWLStereoTexture.Add(renderer, null, tex2d);
			}
		}
	}
	
	// called by the browser
	void RemoveImage() {
		loaded = false;
		VWLStereoTexture.Remove(renderer);
		renderer.material.mainTexture = poster;
	}
	
	public void LookAtPlayer()
	{
		transform.LookAt(vwl.player.transform);
		transform.Rotate(rotateLink);
	}
	
	void OnTriggerEnter(Collider other) {
		if (vwl.player.collider == other) {

			// tell the browser to navigate to linked world
			Application.ExternalEval("VWL_Navigate(" +
				entrance.GetImage(vwl.player.OrientationOffsetProperty, vwl.player.YRotationProperty) +
				"|" + url + ")");
			
			vwl.player.transform.position = entrance.transform.position;
			if (deactivateAfterEnter) {
				gameObject.SetActive(false);
			}
		}
	}
	
	public void Select(bool _select, bool open) {
		if (_select && !loaded && vwl.selectMaterial != null) {
			Material[] materials = new Material[2];
			materials[0] = renderer.material;
			materials[1] = vwl.selectMaterial;
			renderer.materials = materials;
		}
		else if (renderer.materials.Length == 2) {
			Material[] materials = new Material[1];
			materials[0] = renderer.material;
			renderer.materials = materials;
		}
		if (_select && !loaded && open) {
			
			// tell the browser to open linked world
			Application.ExternalEval("VWL_Open(" + url + ")");
		}
	}
	
}
