package com.semafone.test.rogersmoneris.profile;

public class Credentials {
	private final String storeId;
	private final String apiToken;

	public Credentials(String storeId, String apiToken) {
		this.storeId = storeId;
		this.apiToken = apiToken;
	}
	
	@Override
	public String toString() {
		return "Credentials [storeId=" + storeId + ", apiToken=" + apiToken + "]";
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + ((apiToken == null) ? 0 : apiToken.hashCode());
		result = prime * result + ((storeId == null) ? 0 : storeId.hashCode());
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		Credentials other = (Credentials) obj;
		if (apiToken == null) {
			if (other.apiToken != null)
				return false;
		} else if (!apiToken.equals(other.apiToken))
			return false;
		if (storeId == null) {
			if (other.storeId != null)
				return false;
		} else if (!storeId.equals(other.storeId))
			return false;
		return true;
	}
}
