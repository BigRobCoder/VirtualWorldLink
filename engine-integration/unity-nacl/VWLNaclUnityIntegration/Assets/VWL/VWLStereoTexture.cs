// VWLStereoTexture.cs
// Helper script to create stereo textures (different image shows to each eye).

using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class VWLStereoTexture {

	private struct StereoTexture {
		public Texture2D left;
		public Texture2D right;
	}
	private static Dictionary<Renderer, StereoTexture> stereoTexTbl = new Dictionary<Renderer, StereoTexture>();
	
	public static void Add(Renderer renderer, Texture2D left, Texture2D right)
	{
		StereoTexture stereoTex;
		if (stereoTexTbl.ContainsKey(renderer))
		{
			stereoTex = stereoTexTbl[renderer];
		}
		else
		{
			stereoTex = new StereoTexture();
		}
		if (left != null)
		{
			stereoTex.left = left;
		}
		if (right != null)
		{
			stereoTex.right = right;
		}
		stereoTexTbl[renderer] = stereoTex;
	}
	
	public static bool Remove(Renderer renderer)
	{
		return stereoTexTbl.Remove(renderer);
	}
	
	public static void Set(string cameraName)
	{
		bool left;
		if (cameraName == "CameraLeft")
		{
			left = true;
		}
		else if (cameraName == "CameraRight")
		{
			left = false;
		}
		else
		{
			return;
		}
		foreach (KeyValuePair<Renderer, StereoTexture> stereoTex in stereoTexTbl)
		{
			if (left)
			{
				stereoTex.Key.material.mainTexture = stereoTex.Value.left;
			}
			else
			{
				stereoTex.Key.material.mainTexture = stereoTex.Value.right;
			}
		}
	}
	
}
