package no.vestra.common.api;

import java.time.Instant;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/status")
public class StatusController {

	private final String version;

	public StatusController(ObjectProvider<BuildProperties> buildProperties) {
		BuildProperties props = buildProperties.getIfAvailable();
		this.version = props != null ? props.getVersion() : "dev";
	}

	@GetMapping
	public StatusResponse status() {
		return new StatusResponse("Vestra", version, Instant.now());
	}

	public record StatusResponse(String name, String version, Instant serverTime) {
	}

}
