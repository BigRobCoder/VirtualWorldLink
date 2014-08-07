// VWLEntrance.cs
// Attach to the camera controller that serves as the entrance to the scene.

using UnityEngine;
using System.Collections;

public class VWLEntrance : MonoBehaviour {
	
	private OVRCameraController controller = null;
	private static RenderTexture rt;
	private static int nonoverlapPixels;
	private static Texture2D textureToDraw;
	private static Rect drawAreaRectLeft;
	private static Rect drawAreaRectRight;
	
	void Start() {
		controller = GetComponent<OVRCameraController>();
	}
	
	// must be called after the HMD is intialized
	public static void Init() {
		rt = new RenderTexture(Screen.width/2, Screen.height, 32);
		// rt.name = "vwl_rt"; 
		
		// create destination texture and source rectangles for reading pixels,
		// adjusted for the non-overlapping areas
		float nonoverlapMeters = (OVRDevice.HScreenSize/2 - 0.064f) * OVRDevice.DistortionScale();
		nonoverlapPixels = Mathf.RoundToInt(nonoverlapMeters * (Screen.width / OVRDevice.HScreenSize));
		textureToDraw = new Texture2D(rt.width - nonoverlapPixels, rt.height);
		drawAreaRectLeft = new Rect(nonoverlapPixels, 0, rt.width - nonoverlapPixels, rt.height);
		drawAreaRectRight = new Rect(0, 0, rt.width - nonoverlapPixels, rt.height);
	}
	
	public string GetImage(Quaternion orientationOffset, float yRotation) {
		RenderTexture currentRT = RenderTexture.active;
		RenderTexture.active = rt;
		controller.SetRenderTexture(rt);

		controller.SetOrientationOffset(orientationOffset);
		controller.SetYRotation(yRotation);
		
		controller.RenderLeft();
		textureToDraw.ReadPixels(drawAreaRectLeft, 0, 0);
		byte[] left = textureToDraw.EncodeToPNG();
		
		controller.RenderRight();
		textureToDraw.ReadPixels(drawAreaRectRight, 0, 0);
		byte[] right = textureToDraw.EncodeToPNG();
		
		RenderTexture.active = currentRT;
		return "data:image/png;base64," + System.Convert.ToBase64String(left) +
			"|data:image/png;base64," + System.Convert.ToBase64String(right);
	}
	
}
